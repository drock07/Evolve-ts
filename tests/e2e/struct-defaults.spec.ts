import { test, expect } from '@playwright/test';
import { bootGame, startCivilization } from './harness';

/**
 * Validates GameStructure and the region types against the engine's own
 * struct() declarations.
 *
 * The region subtrees — portal, interstellar, tauceti, eden, galaxy,
 * starDock — are empty in both save fixtures, so unlike every other type in
 * src/types/state.ts they could not be derived from save data. They come
 * instead from the struct() declarations in the actions tree, which is the
 * same source initStruct() uses to create each record. This test keeps that
 * derivation honest: if a structure ever declares a default that GameStructure
 * cannot describe, it fails here rather than silently drifting.
 */

/** Regions typed as maps of GameStructure in src/types/state.ts. */
const STRUCTURE_REGIONS = new Set([
    'city', 'space', 'portal', 'interstellar', 'tauceti', 'eden', 'galaxy', 'starDock',
]);

test('every declared structure matches GameStructure', async ({ page }) => {
    await bootGame(page);
    await startCivilization(page, 'human');

    const structs = await page.evaluate(
        () => (window as any).__evolveTest__.structDefaults(),
    );

    // Guards against the sweep silently finding nothing.
    expect(structs.length).toBeGreaterThan(300);

    /**
     * Declared through struct() but typed as a special key rather than a
     * structure, because it has no `count`. See PortalThrone.
     */
    const NOT_A_STRUCTURE = new Set(['portal.throne']);

    const badRegion: string[] = [];
    const noCount: string[] = [];
    const badField: string[] = [];

    for (const { region, key, shape } of structs) {
        if (!STRUCTURE_REGIONS.has(region)) badRegion.push(`${region}.${key}`);
        if (typeof shape.count !== 'number' && !NOT_A_STRUCTURE.has(`${region}.${key}`)) {
            noCount.push(`${region}.${key}`);
        }

        for (const [field, value] of Object.entries(shape)) {
            // StructureField = number | string | boolean | unknown[] |
            // Record<string, unknown> | undefined
            const ok =
                value === null ||
                ['number', 'string', 'boolean', 'undefined'].includes(typeof value) ||
                Array.isArray(value) ||
                typeof value === 'object';
            if (!ok) badField.push(`${region}.${key}.${field}: ${typeof value}`);
        }
    }

    // A structure in a region that is not typed as a structure map means
    // GameState is missing a region.
    expect(badRegion, 'structures in an untyped region').toEqual([]);
    // GameStructure declares `count` required.
    expect(noCount, 'structures with no numeric count').toEqual([]);
    expect(badField, 'fields outside StructureField').toEqual([]);
});

test('every region typed as a structure map actually has structures', async ({ page }) => {
    await bootGame(page);
    await startCivilization(page, 'human');

    const structs = await page.evaluate(
        () => (window as any).__evolveTest__.structDefaults(),
    );
    const seen = new Set(structs.map((s: any) => s.region));

    // If one of these stops appearing, either the region was renamed or the
    // sweep broke — both of which would quietly weaken the type above.
    for (const region of STRUCTURE_REGIONS) {
        expect(seen.has(region), `no structures found for global.${region}`).toBe(true);
    }
});
