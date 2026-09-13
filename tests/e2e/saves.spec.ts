import { test, expect } from '@playwright/test';
import {
    bootGame,
    runTicks,
    snapshotSlice,
    roundNumbers,
    loadSaveFixture,
    readSaveFixture,
} from './harness';

/**
 * Golden masters driven by real player saves.
 *
 * These reach code the synthetic scenario in golden-master.spec.ts cannot:
 * an actual tech tree, space sectors, and — because both fixtures predate
 * the current version — the whole save-migration chain in vars.ts, which
 * upgrades old saves on load and is exactly the sort of thing that breaks
 * silently during a refactor.
 */

const FIXTURES = [
    {
        name: 'orc-midgame-1.2.20',
        // Orc civilization, standard universe, 8 MAD resets, ~78k days in,
        // 70 techs, space program started.
        version: '1.2.20',
        species: 'orc',
    },
    {
        name: 'prestige-evolution-1.3.9',
        // Taken moments after a reset, so it sits in the evolution phase —
        // but with 697 plasmids, 113 phage and 35 resets behind it, which
        // exercises the prestige and genetics modifiers a new game never hits.
        version: '1.3.9',
        species: 'protoplasm',
    },
] as const;

test.describe('save fixtures', () => {
    for (const fixture of FIXTURES) {
        test(`${fixture.name} is the save we think it is`, async () => {
            // Guards against someone swapping a fixture without updating the
            // tests that depend on what it contains.
            const save = readSaveFixture(fixture.name);
            expect(save.version).toBe(fixture.version);
            expect(save.race.species).toBe(fixture.species);
        });

        test(`${fixture.name} loads and migrates without throwing`, async ({ page }) => {
            const errors: string[] = [];
            page.on('pageerror', err => errors.push(String(err)));

            await bootGame(page, { save: loadSaveFixture(fixture.name) });

            // vars.ts rewrites the save forward on load; confirm it landed on
            // the current version rather than silently keeping the old one.
            const version = await page.evaluate(
                () => (window as any).__evolveTest__.global.version,
            );
            expect(version).toBe('1.4.10');

            expect(errors, `page errors:\n${errors.join('\n')}`).toEqual([]);
        });

        test(`${fixture.name} simulates forward without throwing`, async ({ page }) => {
            const errors: string[] = [];
            page.on('pageerror', err => errors.push(String(err)));

            await bootGame(page, { save: loadSaveFixture(fixture.name) });
            await runTicks(page, 2000);

            expect(errors, `page errors:\n${errors.join('\n')}`).toEqual([]);
        });

        for (const slice of ['resource', 'city', 'civic', 'tech', 'space'] as const) {
            test(`${fixture.name} — ${slice} after 500 ticks`, async ({ page }) => {
                await bootGame(page, { save: loadSaveFixture(fixture.name) });
                await runTicks(page, 500);

                const state = roundNumbers(await snapshotSlice(page, slice));
                expect(JSON.stringify(state, null, 2)).toMatchSnapshot(
                    `${fixture.name}-${slice}-500.json`,
                );
            });
        }
    }

    test('a loaded save replays deterministically', async ({ page }) => {
        const save = loadSaveFixture('orc-midgame-1.2.20');

        await bootGame(page, { save });
        await runTicks(page, 300);
        const first = roundNumbers(await snapshotSlice(page, 'resource'));

        await bootGame(page, { save });
        await runTicks(page, 300);
        const second = roundNumbers(await snapshotSlice(page, 'resource'));

        expect(second).toEqual(first);
    });
});
