import { test, expect } from '@playwright/test';
import {
    bootGame,
    runTicks,
    startCivilization,
    seedScenario,
    snapshotSlice,
    roundNumbers,
} from './harness';

/**
 * Golden-master regression suite.
 *
 * The premise: this codebase has ~128k lines of game logic and no unit tests,
 * so the only affordable safety net for a large refactor is "run the engine
 * and check the numbers did not move". These tests pin the RNG and the clock,
 * simulate a fixed number of ticks from a fixed scenario, and compare state
 * against a committed snapshot.
 *
 * When a change legitimately alters game behaviour, regenerate with:
 *   pnpm run test:e2e:update
 * and read the resulting diff carefully — that diff is the whole point.
 */

/** Put the engine into the standard, deterministic starting scenario. */
async function boot(page: import('@playwright/test').Page) {
    await bootGame(page);
    await startCivilization(page, 'human');
    await seedScenario(page);
}

test.describe('engine determinism', () => {
    test('two identical runs produce identical state', async ({ page }) => {
        await boot(page);
        await runTicks(page, 200);
        const first = roundNumbers(await snapshotSlice(page, 'resource'));

        await boot(page);
        await runTicks(page, 200);
        const second = roundNumbers(await snapshotSlice(page, 'resource'));

        // If this fails, something in the engine reads an unpinned source of
        // entropy, and every other golden master here is untrustworthy.
        expect(second).toEqual(first);
    });

    test('ticks drive the simulation forward', async ({ page }) => {
        await boot(page);
        await runTicks(page, 50);
        const early = roundNumbers(await snapshotSlice(page, 'resource'));

        await runTicks(page, 200);
        const later = roundNumbers(await snapshotSlice(page, 'resource'));

        // A no-op runTicks would make every golden master below vacuous.
        expect(later).not.toEqual(early);
    });

    test('the calendar advances', async ({ page }) => {
        await boot(page);
        await runTicks(page, 400);

        const stats = (await snapshotSlice(page, 'stats')) as { days?: number };
        expect(stats.days).toBeGreaterThan(0);
    });
});

test.describe('golden master — seeded civilization', () => {
    // Each entry becomes its own committed snapshot file. Slicing keeps the
    // golden files readable and makes a failure point somewhere specific,
    // rather than rewriting one giant blob on every unrelated change.
    const SLICES = ['resource', 'city', 'civic', 'race', 'tech', 'stats'];

    for (const ticks of [100, 1000]) {
        for (const slice of SLICES) {
            test(`${slice} after ${ticks} ticks`, async ({ page }) => {
                await boot(page);
                await runTicks(page, ticks);

                const state = roundNumbers(await snapshotSlice(page, slice));
                expect(JSON.stringify(state, null, 2)).toMatchSnapshot(
                    `seeded-${slice}-${ticks}.json`,
                );
            });
        }
    }
});

test.describe('smoke', () => {
    test('boots with no console errors and renders the shell', async ({ page }) => {
        const errors: string[] = [];
        page.on('console', msg => {
            if (msg.type() !== 'error') return;
            const text = msg.text();
            // The harness aborts every off-origin request (see harness.ts), and
            // each abort surfaces here as a resource-load error. Those are the
            // harness doing its job, not the game misbehaving.
            if (text.includes('Failed to load resource')) return;
            errors.push(text);
        });

        await bootGame(page);

        await expect(page.locator('#topBar')).toBeVisible();
        await expect(page.locator('#resources')).toBeVisible();
        await expect(page.locator('.tabs li').first()).toBeVisible();

        expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
    });

    test('a civilization survives a long run without throwing', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', err => errors.push(String(err)));

        await boot(page);
        // Long enough to cross many mid/long loop boundaries and a season change.
        await runTicks(page, 5000);

        // This is what caught the moraleCap scope regression: a ReferenceError
        // thrown from fastLoop on the first tick after leaving evolution.
        expect(errors, `page errors:\n${errors.join('\n')}`).toEqual([]);
    });
});
