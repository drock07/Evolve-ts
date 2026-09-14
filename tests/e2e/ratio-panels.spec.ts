import { test, expect, type Page } from '@playwright/test';
import { bootGame, runTicks, loadSaveFixture, unlockStructure, unlockFlags } from './harness';

/**
 * Behavioural baseline for the ratio panels — the titan mine and the
 * smoldering quarry, in industry.ts.
 *
 * Both split one structure's output between two resources with a 0-100 slider
 * and a pair of steppers. They are structurally identical, differing only in
 * their labels and which field of the record they write, which is why they get
 * one component between them rather than two.
 *
 * Both are reached by seeding — neither is unlocked in any save fixture — so
 * these test a world that is assembled rather than played. See
 * unlockStructure() in the harness for what that is worth.
 *
 * They are also the panels that carry <b-slider>, so they are where Buefy's
 * slider goes.
 */

const SAVE = 'orc-midgame-1.2.20';

interface Panel {
    name: string;
    id: string;
    /** Where the ratio lives in the engine. */
    read: (page: Page) => Promise<number>;
    seed: (page: Page) => Promise<void>;
}

const PANELS: Panel[] = [
    {
        name: 'titan mine',
        id: '#iTMine',
        read: page => page.evaluate(
            () => (window as any).__evolveTest__.global.space.titan_mine.ratio as number),
        seed: page => unlockStructure(page, 'space', 'titan_mine', { count: 3 }),
    },
    {
        name: 'quarry',
        id: '#iQuarry',
        read: page => page.evaluate(
            () => (window as any).__evolveTest__.global.city.rock_quarry.asbestos as number),
        seed: page => unlockFlags(page, { race: { smoldering: 1 } }),
    },
];

async function openIndustry(page: Page, panel: Panel): Promise<void> {
    await bootGame(page, { save: loadSaveFixture(SAVE) });
    await runTicks(page, 20);
    await panel.seed(page);
    await runTicks(page, 1);
    await page.locator('.tabs').first().locator('li').nth(2).click();
    await page.locator('#mTabCivic .tabs li').nth(1).click();
    await expect(page.locator(panel.id)).toBeVisible();
}

for (const panel of PANELS) {
    test.describe(`${panel.name} ratio panel`, () => {
        test('renders a description and a slider between two steppers', async ({ page }) => {
            await openIndustry(page, panel);

            const bar = page.locator(`${panel.id} .sliderbar`);
            await expect(bar).toHaveCount(1);
            await expect(bar.locator('.sub')).toHaveCount(1);
            await expect(bar.locator('.add')).toHaveCount(1);
            // The panel says what the split is between.
            await expect(page.locator(panel.id)).not.toBeEmpty();
        });

        test('the steppers move the ratio', async ({ page }) => {
            await openIndustry(page, panel);
            const before = await panel.read(page);

            await page.locator(`${panel.id} .sliderbar .add`).click();
            expect(await panel.read(page)).toBe(before + 1);

            await page.locator(`${panel.id} .sliderbar .sub`).click();
            expect(await panel.read(page)).toBe(before);
        });

        test('the ratio is held between nothing and everything', async ({ page }) => {
            await openIndustry(page, panel);

            for (let i = 0; i < 105; i++) {
                await page.locator(`${panel.id} .sliderbar .add`).click();
            }
            expect(await panel.read(page)).toBe(100);

            for (let i = 0; i < 105; i++) {
                await page.locator(`${panel.id} .sliderbar .sub`).click();
            }
            expect(await panel.read(page)).toBe(0);
        });

        test('the steppers say which way they move production', async ({ page }) => {
            await openIndustry(page, panel);

            await expect(page.locator(`${panel.id} .sliderbar .sub`))
                .toHaveAttribute('aria-label', /Increase .* Production/);
            await expect(page.locator(`${panel.id} .sliderbar .add`))
                .toHaveAttribute('aria-label', /Increase .* Production/);
        });
    });
}
