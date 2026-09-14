import { test, expect, type Page } from '@playwright/test';
import { bootGame, runTicks, loadSaveFixture, unlockStructure, unlockFlags } from './harness';

/**
 * Behavioural baseline for the tau ceti ratio panels — the mining ship and the
 * alien space station.
 *
 * Both are the same control the titan mine and quarry use, so they are the
 * other four callers RatioSlider was extracted for. The mining ship stacks
 * three of them, one per grade of ore, with the third gated on a further tech.
 *
 * Reached entirely by seeding: this is deep tau ceti content that no save
 * fixture comes close to. See unlockStructure() for what that is worth.
 */

const SAVE = 'orc-midgame-1.2.20';

async function openIndustry(page: Page, id: string, seed: (p: Page) => Promise<void>): Promise<void> {
    await bootGame(page, { save: loadSaveFixture(SAVE) });
    await runTicks(page, 20);
    await seed(page);
    await runTicks(page, 1);
    await page.locator('.tabs').first().locator('li').nth(2).click();
    await page.locator('#mTabCivic .tabs li').nth(1).click();
    await expect(page.locator(id)).toBeVisible();
}

const seedShip = async (page: Page) => {
    await unlockFlags(page, { tech: { tau_roid: 5 } });
    await unlockStructure(page, 'tauceti', 'mining_ship', { count: 1 });
};

const seedStation = async (page: Page) => {
    await unlockFlags(page, { tech: { tau_gas2: 6 } });
    // `focus` is not in the station's struct() declaration — a later tech adds
    // it, at 95 — so seeding has to supply it the way that tech would.
    await unlockStructure(page, 'tauceti', 'alien_space_station',
        { count: 1, fields: { focus: 95 } });
};

const ship = (page: Page, field: string) => page.evaluate(
    f => (window as any).__evolveTest__.global.tauceti.mining_ship[f] as number, field);

test.describe('mining ship', () => {
    test('stacks a slider per grade of ore', async ({ page }) => {
        await openIndustry(page, '#iMiningShip', seedShip);

        // Common, uncommon and rare — the third only at tau_roid 5.
        await expect(page.locator('#iMiningShip .sliderbar')).toHaveCount(3);
    });

    test('the rare grade is withheld until its tech', async ({ page }) => {
        await openIndustry(page, '#iMiningShip', async (p) => {
            await unlockFlags(p, { tech: { tau_roid: 4 } });
            await unlockStructure(p, 'tauceti', 'mining_ship', { count: 1 });
        });

        await expect(page.locator('#iMiningShip .sliderbar')).toHaveCount(2);
    });

    test('each slider moves its own grade and leaves the others alone', async ({ page }) => {
        await openIndustry(page, '#iMiningShip', seedShip);
        const before = {
            common: await ship(page, 'common'),
            uncommon: await ship(page, 'uncommon'),
        };

        await page.locator('#iMiningShip .sliderbar').first().locator('.add').click();

        expect(await ship(page, 'common')).toBe(before.common + 1);
        expect(await ship(page, 'uncommon')).toBe(before.uncommon);
    });

    test('a grade is held between nothing and everything', async ({ page }) => {
        await openIndustry(page, '#iMiningShip', seedShip);
        const bar = page.locator('#iMiningShip .sliderbar').first();

        for (let i = 0; i < 105; i++) await bar.locator('.add').click();
        expect(await ship(page, 'common')).toBe(100);

        for (let i = 0; i < 105; i++) await bar.locator('.sub').click();
        expect(await ship(page, 'common')).toBe(0);
    });
});

test.describe('alien space station', () => {
    test('offers one slider for its knowledge focus', async ({ page }) => {
        await openIndustry(page, '#iAlienSpaceStation', seedStation);

        await expect(page.locator('#iAlienSpaceStation .sliderbar')).toHaveCount(1);
        await expect(page.locator('#iAlienSpaceStation .sliderbar .sub'))
            .toHaveAttribute('aria-label', /Decrease Knowledge Focus/);
        await expect(page.locator('#iAlienSpaceStation .sliderbar .add'))
            .toHaveAttribute('aria-label', /Increase Knowledge Focus/);
    });

    test('the steppers move the focus within its bounds', async ({ page }) => {
        await openIndustry(page, '#iAlienSpaceStation', seedStation);
        const focus = () => page.evaluate(
            () => (window as any).__evolveTest__.global.tauceti.alien_space_station.focus as number);
        const before = await focus();

        await page.locator('#iAlienSpaceStation .sliderbar .add').click();
        expect(await focus()).toBe(before + 1);

        for (let i = 0; i < 105; i++) {
            await page.locator('#iAlienSpaceStation .sliderbar .sub').click();
        }
        expect(await focus()).toBe(0);
    });
});
