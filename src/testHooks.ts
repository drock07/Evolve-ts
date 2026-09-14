/**
 * Test hooks — engine access for the golden-master harness.
 *
 * The game normally advances only when the web worker posts a tick, which
 * makes it useless for testing: you cannot simulate a thousand game days
 * without waiting a thousand game days. These hooks let a test driver stop
 * the worker, pin every source of nondeterminism, and then drive the engine
 * loops synchronously as fast as the CPU allows.
 *
 * Disabled by default. Only installed when the page URL carries `?e2e=1`,
 * so a production build exposes nothing. Vite tree-shakes nothing here —
 * the module is tiny and the guard is a runtime check — but the surface is
 * read/write access to state the page's own scripts already hold, so the
 * guard is about keeping the global namespace clean, not about secrecy.
 */

import { global, webWorker, seededRandom, setGlobal } from './vars';
import { sentience, actions } from './actions';
import { islandCount } from './engine/islands';
import { isE2E } from './engine/e2e';
import { deadPopovers, popoverBindingCount } from './engine/popoverAudit';

/** Seed used for every deterministic run. Arbitrary, but must never change. */
export const TEST_SEED = 12345;

/** Fixed wall-clock instant (2020-01-01T00:00:00Z) for frozen-time runs. */
export const TEST_EPOCH = 1577836800000;

export interface TestHooks {
    global: typeof global;
    webWorker: typeof webWorker;
    seededRandom: typeof seededRandom;
    setGlobal: typeof setGlobal;
    execGameLoops: (periods?: number) => void;
    /** Halt the worker-driven loop so the driver has exclusive control of time. */
    freeze(): void;
    /** Replace Math.random with a seeded LCG and pin the game's own seeds. */
    pinRandom(seed?: number): void;
    /** Freeze Date.now so elapsed-time logic cannot vary between runs. */
    pinClock(epoch?: number): void;
    /** Advance the engine by `periods` fast-loop ticks, bypassing the worker. */
    runTicks(periods: number): void;
    /**
     * Skip the evolution phase and begin a civilization as `race`.
     *
     * A brand-new game sits in the protoplasm phase, where longLoop returns
     * immediately and nothing accumulates — a useless baseline. This jumps
     * straight to the state where the engine actually does work.
     */
    startCivilization(race?: string): void;
    /**
     * Every structure's canonical default shape, read from its own struct()
     * declaration in the actions tree — the same source initStruct() uses to
     * create the record. Lets the type tests cover regions no save reaches.
     */
    structDefaults(): Array<{ region: string; key: string; shape: Record<string, unknown> }>;
    /** Live React islands mounted inside legacy DOM (see engine/islands.ts). */
    islandCount(): number;
    /**
     * Legacy popovers that cannot fire — bound to nothing, or to an element
     * that has since been replaced. See engine/popoverAudit.ts.
     */
    deadPopovers(): Array<{ id: string; selector: string; reason: string }>;
    /** How many popover registrations the audit has seen. */
    popoverBindingCount(): number;
    /** Deep clone of `global` with volatile fields stripped. */
    snapshot(): Record<string, unknown>;
}

/**
 * Keys whose values legitimately differ between two otherwise identical
 * runs (wall-clock stamps, session bookkeeping). Stripped before comparison
 * so a golden master does not fail for reasons unrelated to game logic.
 */
const VOLATILE_PATHS = [
    'stats.start',
    'stats.current',
    'settings.at',
];

function stripPath(obj: any, path: string): void {
    const parts = path.split('.');
    let node = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        if (node === null || typeof node !== 'object') return;
        node = node[parts[i]];
    }
    if (node && typeof node === 'object') {
        delete node[parts[parts.length - 1]];
    }
}

/**
 * Structured clone that drops functions and coerces -0 to 0, so the result
 * survives Playwright's serialization boundary and compares stably.
 */
function stableClone(value: any, seen = new WeakSet()): any {
    if (value === null || typeof value !== 'object') {
        if (typeof value === 'function') return undefined;
        if (typeof value === 'number') {
            if (Object.is(value, -0)) return 0;
            if (!Number.isFinite(value)) return String(value);
        }
        return value;
    }
    if (seen.has(value)) return '[circular]';
    seen.add(value);

    if (Array.isArray(value)) {
        return value.map(v => stableClone(v, seen));
    }
    if (value instanceof Map) {
        return { __map: [...value.entries()].map(([k, v]) => [k, stableClone(v, seen)]) };
    }
    if (value instanceof Set) {
        return { __set: [...value].map(v => stableClone(v, seen)) };
    }

    const out: Record<string, unknown> = {};
    // Sort keys so insertion order never affects the serialized form.
    for (const key of Object.keys(value).sort()) {
        const cloned = stableClone(value[key], seen);
        if (cloned !== undefined) out[key] = cloned;
    }
    return out;
}

export function installTestHooks(execGameLoops: (periods?: number) => void): void {
    if (!isE2E()) return;

    const hooks: TestHooks = {
        global,
        webWorker,
        seededRandom,
        setGlobal,
        execGameLoops,

        freeze() {
            // Silence the worker without going through gameLoop('stop'), which
            // also clears webWorker.s — and execGameLoops refuses to run when
            // that flag is false. We want the loop callable, just not automatic.
            if (webWorker.w) {
                webWorker.w.postMessage({ loop: 'clear' });
            }
            webWorker.s = true;
        },

        pinRandom(seed = TEST_SEED) {
            let state = seed >>> 0;
            Math.random = function () {
                // Numerical Recipes LCG — same family as the game's own
                // seededRandom, chosen for reproducibility, not quality.
                state = (state * 1664525 + 1013904223) >>> 0;
                return state / 4294967296;
            };
            // The game draws its own seed from Math.rand() at new-game time,
            // so pinning Math.random alone is not enough for an already-booted
            // page — overwrite the persisted seeds too.
            global.seed = seed;
            global.warseed = seed + 1;
        },

        pinClock(epoch = TEST_EPOCH) {
            Date.now = () => epoch;
        },

        runTicks(periods: number) {
            // execGameLoops caps each call at 12 game days of catch-up, so
            // drive it in bounded slices rather than one oversized request.
            const slice = 10;
            let left = periods;
            while (left > 0) {
                const n = Math.min(slice, left);
                execGameLoops(n);
                left -= n;
            }
        },

        startCivilization(race = 'human') {
            global.race.species = race;
            sentience();
        },

        structDefaults() {
            const out: Array<{ region: string; key: string; shape: Record<string, unknown> }> = [];
            const seen = new Set<string>();

            const walk = (node: any, depth: number) => {
                if (!node || typeof node !== 'object' || depth > 4) return;
                for (const value of Object.values<any>(node)) {
                    if (!value || typeof value !== 'object') continue;
                    if (typeof value.struct === 'function') {
                        try {
                            const st = value.struct();
                            if (st && st.p && st.d) {
                                const [key, region] = st.p;
                                const id = `${region}.${key}`;
                                if (!seen.has(id)) {
                                    seen.add(id);
                                    out.push({ region, key, shape: st.d });
                                }
                            }
                        } catch {
                            // struct() can depend on game state that does not
                            // exist yet; skip rather than fail the sweep.
                        }
                    }
                    walk(value, depth + 1);
                }
            };

            walk(actions, 0);
            return out;
        },

        islandCount,
        deadPopovers,
        popoverBindingCount,

        snapshot() {
            const clone = stableClone(global) as Record<string, unknown>;
            for (const path of VOLATILE_PATHS) {
                stripPath(clone, path);
            }
            return clone;
        },
    };

    (window as any).__evolveTest__ = hooks;
}
