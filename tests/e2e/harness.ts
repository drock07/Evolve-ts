import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import LZString from 'lz-string';

/**
 * Shared driver for the golden-master tests.
 *
 * Every helper here runs inside the page via `page.evaluate`, talking to the
 * hooks installed by `src/testHooks.ts`. Keep the serialized payloads small:
 * a full `global` snapshot for a late-game save is multiple megabytes.
 */

/** Matches TEST_SEED / TEST_EPOCH in src/testHooks.ts. */
export const TEST_SEED = 12345;

export interface BootOptions {
    /** Seed injected into localStorage before the page's scripts run. */
    save?: string;
    /** Skip pinning Math.random — only for tests asserting on randomness. */
    noPinRandom?: boolean;
}

/**
 * Load the game, wait for it to finish booting, and put the engine under the
 * test driver's exclusive control (worker silenced, RNG and clock pinned).
 */
export async function bootGame(page: Page, opts: BootOptions = {}): Promise<void> {
    // A save has to be in localStorage before any module evaluates, because
    // vars.ts reads it at import time and never re-reads it.
    //
    // Clearing is just as load-bearing as seeding: longLoop autosaves, so a
    // second bootGame on the same page would otherwise resume the *previous*
    // run's save instead of starting fresh — which silently destroys
    // determinism and makes every golden master depend on test ordering.
    await page.addInitScript(saveData => {
        try {
            window.localStorage.clear();
            if (saveData) window.localStorage.setItem('evolved', saveData as string);
        } catch {
            // Storage can be unavailable; the game copes, so the harness does too.
        }
    }, opts.save ?? null);

    // Keep the run hermetic: the page pulls in Google Analytics, which is both
    // irrelevant to the engine and unreachable from a sandboxed CI runner.
    // Aborting these requests removes a whole class of spurious failures.
    await page.route('**/*', route => {
        const url = new URL(route.request().url());
        const isLocal = url.hostname === '127.0.0.1' || url.hostname === 'localhost';
        return isLocal ? route.continue() : route.abort();
    });

    const errors: string[] = [];
    page.on('pageerror', err => errors.push(String(err)));

    await page.goto('/index.html?e2e=1', { waitUntil: 'domcontentloaded' });

    // installTestHooks runs at module-eval time, but legacyInit only runs
    // after the React root commits. Wait for the later of the two.
    await page.waitForFunction(() => !!(window as any).__evolveTest__, null, { timeout: 60_000 });
    await page.waitForSelector('#react-root', { timeout: 60_000 });
    await page.waitForFunction(() => !document.querySelector('.loading'), null, { timeout: 60_000 });

    if (errors.length) {
        throw new Error(`Page errors during boot:\n${errors.join('\n')}`);
    }

    await page.evaluate(pin => {
        const t = (window as any).__evolveTest__;
        t.freeze();
        t.pinClock();
        if (pin) t.pinRandom();
    }, !opts.noPinRandom);
}

/**
 * Leave the evolution phase and start a civilization.
 *
 * Must be called after bootGame and before the ticks you want to measure.
 */
export async function startCivilization(page: Page, race = 'human'): Promise<void> {
    await page.evaluate(r => {
        (window as any).__evolveTest__.startCivilization(r);
    }, race);
}

/** Advance the engine by `periods` fast-loop ticks. */
export async function runTicks(page: Page, periods: number): Promise<void> {
    await page.evaluate(n => {
        (window as any).__evolveTest__.runTicks(n);
    }, periods);
}

/**
 * Snapshot a named subtree of `global`, rather than the whole object.
 *
 * Whole-state snapshots are both enormous and brittle — a single new setting
 * key rewrites the entire golden file and buries any real diff. Slicing keeps
 * each golden file readable and makes failures point somewhere specific.
 */
export async function snapshotSlice(page: Page, path: string): Promise<unknown> {
    return page.evaluate(p => {
        const snap = (window as any).__evolveTest__.snapshot();
        return p.split('.').reduce((node: any, key: string) => node?.[key], snap) ?? null;
    }, path);
}

/** Full snapshot — use sparingly, and only for early-game states. */
export async function snapshotAll(page: Page): Promise<Record<string, unknown>> {
    return page.evaluate(() => (window as any).__evolveTest__.snapshot());
}

/**
 * Round every number in a structure to `digits` significant decimals.
 *
 * The engine accumulates floats across thousands of ticks, so the last bits
 * drift between Chromium builds. Rounding keeps the golden master sensitive
 * to real balance changes without failing on 1e-13 noise.
 */
export function roundNumbers<T>(value: T, digits = 6): T {
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) return value;
        return Number(value.toFixed(digits)) as unknown as T;
    }
    if (Array.isArray(value)) {
        return value.map(v => roundNumbers(v, digits)) as unknown as T;
    }
    if (value && typeof value === 'object') {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value)) {
            out[k] = roundNumbers(v, digits);
        }
        return out as unknown as T;
    }
    return value;
}

/**
 * Seed a small but genuinely active early-game civilization.
 *
 * `startCivilization` leaves the game at day 0, and longLoop's clock only
 * runs once `calendar.day > 0` — so without this the engine is set up but
 * idle, and a golden master over it would assert nothing. This grants the
 * minimum that makes production, population and research actually flow:
 * a started calendar, housed and employed citizens, and the three basic
 * production buildings.
 *
 * Values are arbitrary but must stay fixed — changing them invalidates
 * every committed snapshot.
 */
export async function seedScenario(page: Page): Promise<void> {
    await page.evaluate(() => {
        const g = (window as any).__evolveTest__.global;
        const species = g.race.species;

        // Start the clock.
        g.city.calendar.day = 1;

        // Housing and basic production.
        g.city.basic_housing = { count: 8 };
        g.city.farm = { count: 5 };
        g.city.lumber_yard = { count: 4 };
        g.city.rock_quarry = { count: 2, on: 2 };

        // Population, housed and employed.
        g.resource[species].display = true;
        g.resource[species].max = 10;
        g.resource[species].amount = 8;

        // Jobs default to display:false / max:0 straight out of sentience();
        // without both of these the engine assigns them no output at all.
        for (const [job, workers] of Object.entries({
            farmer: 3, lumberjack: 2, quarry_worker: 1, unemployed: 2,
        })) {
            g.civic[job].display = true;
            g.civic[job].max = -1;
            g.civic[job].workers = workers;
        }

        // Minimum tech for the basic production chain to be considered unlocked.
        Object.assign(g.tech, { primitive: 3, farm: 1, axe: 1, hammer: 1, storage: 1 });

        // Unlock the resources those jobs produce, so the engine tracks them.
        for (const res of ['Food', 'Lumber', 'Stone', 'Knowledge', 'Money', 'Crates']) {
            if (g.resource[res]) {
                g.resource[res].display = true;
                if (g.resource[res].max === 0) g.resource[res].max = 500;
            }
        }
        g.resource.Food.amount = 100;
        g.resource.Lumber.amount = 100;
        g.resource.Stone.amount = 100;
    });
}

/**
 * Playwright compiles these files to CJS, so `import.meta.url` is not
 * available; resolve from the repo root instead, which is where the runner
 * is invoked from.
 */
function readFixture(name: string): string {
    return readFileSync(resolve(process.cwd(), 'tests/fixtures/saves', `${name}.txt`), 'utf8').trim();
}

/**
 * Load an exported save file for use with `bootGame({ save })`.
 *
 * Exports from the game's UI are LZString base64; localStorage holds the
 * UTF16 form. Fixtures are stored in their exported shape — that is what a
 * player actually hands you, and it is a third the size of raw JSON — so
 * they get re-encoded here.
 */
export function loadSaveFixture(name: string): string {
    const exported = readFixture(name);

    const json = LZString.decompressFromBase64(exported);
    if (!json || !json.trimStart().startsWith('{')) {
        throw new Error(`Fixture ${name} is not a valid LZString base64 save export`);
    }
    return LZString.compressToUTF16(json);
}

/** Parsed contents of a fixture, for asserting on what a save actually holds. */
export function readSaveFixture(name: string): Record<string, any> {
    return JSON.parse(LZString.decompressFromBase64(readFixture(name))!);
}

/**
 * Force-unlock content the save fixtures never reach.
 *
 * Most of the game is gated behind progress a mid-game save does not have:
 * ten of the twelve industry panels, and most of space, the portal and beyond.
 * Without this they cannot be rendered at all, so they cannot be pinned before
 * being ported — which is the whole method.
 *
 * What this is and is not: a structure is created from its own struct()
 * declaration in the actions tree, which is the same source initStruct() uses
 * at runtime, so the record shape is the engine's rather than a guess. What it
 * A struct() declaration does not always cover every field a record ends up
 * with: the alien space station declares only its count, and gains its `focus`
 * when a later tech completes. `fields` supplies those, and needing it is a
 * reliable sign that a record is built in more than one place.
 *
 * What this cannot do is reproduce the rest of a game that had actually got there —
 * the techs, resources and traits that would normally accompany it. A panel
 * seeded this way renders and responds, but it is a world the game does not
 * quite produce, and a test written against one is weaker evidence than a test
 * written against a real save. Prefer a fixture where one exists.
 */
export async function unlockStructure(
    page: Page,
    region: string,
    key: string,
    opts: { count?: number; on?: number; fields?: Record<string, unknown> } = {},
): Promise<void> {
    const { count = 1, on = count, fields = {} } = opts;
    await page.evaluate(args => {
        const hooks = (window as any).__evolveTest__;
        const g = hooks.global;

        // The structure's canonical default shape, straight from its own
        // struct() declaration rather than invented here.
        const declared = hooks.structDefaults()
            .find((s: any) => s.region === args.region && s.key === args.key);

        g[args.region] = g[args.region] ?? {};
        g[args.region][args.key] = {
            ...(declared?.shape ?? {}),
            ...(g[args.region][args.key] ?? {}),
            ...args.fields,
            count: args.count,
            on: args.on,
        };
    }, { region, key, count, on, fields });
}

/** Set tech levels and race traits together, for gates that need both. */
export async function unlockFlags(
    page: Page,
    flags: { tech?: Record<string, number>; race?: Record<string, number | boolean> } = {},
): Promise<void> {
    await page.evaluate(f => {
        const g = (window as any).__evolveTest__.global;
        for (const [k, v] of Object.entries(f.tech ?? {})) g.tech[k] = v;
        for (const [k, v] of Object.entries(f.race ?? {})) g.race[k] = v;
    }, flags);
}

/**
 * A save fixture with content added, seeded before the page loads.
 *
 * The live-state helpers above run after boot, which is too late for anything
 * the UI decides once: defineIndustry() settles which panels exist when its
 * tab is first drawn, so a structure conjured after that never gets a panel
 * however true its gate is. Seeding the save instead puts the content in place
 * before any module evaluates, which is also closer to what it means for a
 * game to have got there.
 *
 * Structure shapes still have to be supplied here rather than read from
 * struct(), because there is no page yet to read the actions tree from. Where
 * a panel only needs a count this is a line; where it needs more, the same
 * caveat applies as everywhere else in this file.
 *
 * Verified on space.titan_mine, which seeds this way and gets its panel. Four
 * industry panels resist both this and the live helpers and are not currently
 * reachable by any means here: the pylon, nanite factory, replicator and mech
 * station. Their gates read true after the save loads and no error is raised,
 * yet defineIndustry() produces no container for them — unexplained rather
 * than diagnosed, and left alone. All four are gated on race identity or
 * universe rather than on progress, so a save of the relevant race is
 * probably the honest way in.
 */
export function saveWith(name: string, mutate: (save: Record<string, any>) => void): string {
    const save = readSaveFixture(name);
    mutate(save);
    return LZString.compressToUTF16(JSON.stringify(save));
}

/** Add a structure to a save, creating its region if the run never reached it. */
export function addStructure(
    save: Record<string, any>,
    region: string,
    key: string,
    record: Record<string, unknown>,
): void {
    save[region] = save[region] ?? {};
    save[region][key] = { count: 1, on: 1, ...record };
}

