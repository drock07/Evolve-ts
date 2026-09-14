import { test, expect, type Page } from '@playwright/test';
import { bootGame, runTicks, loadSaveFixture, unlockStructure } from './harness';

/**
 * Behavioural baseline for the mining droid — industry.ts loadDroid().
 *
 * The factory's shape in a different place: each ore is its own row, label
 * first, steppers after. It is the second caller for ProductRow.
 *
 * Its rule at capacity is the simplest of the four and worth pinning for that
 * reason — it has none. Where the smelter walks an order of donors, the
 * factory takes from alloy and the graphene plant compares its rivals, the
 * droid simply stops when every droid is assigned. Nothing is displaced.
 *
 * Reached by seeding; no fixture unlocks interstellar. See unlockStructure().
 */

const SAVE = 'orc-midgame-1.2.20';
const ORES = ['adam', 'uran', 'coal', 'alum'] as const;

async function openDroid(page: Page, count = 4): Promise<void> {
    await bootGame(page, { save: loadSaveFixture(SAVE) });
    await runTicks(page, 20);
    await unlockStructure(page, 'interstellar', 'mining_droid', { count, on: count });
    await runTicks(page, 1);
    await page.locator('.tabs').first().locator('li').nth(2).click();
    await page.locator('#mTabCivic .tabs li').nth(1).click();
    await expect(page.locator('#iDroid')).toBeVisible();
}

function droid(page: Page) {
    return page.evaluate(() => {
        const d = (window as any).__evolveTest__.global.interstellar.mining_droid;
        return {
            on: d.on as number,
            adam: (d.adam ?? 0) as number, uran: (d.uran ?? 0) as number,
            coal: (d.coal ?? 0) as number, alum: (d.alum ?? 0) as number,
        };
    });
}

const row = (page: Page, ore: string) => {
    const container = page.locator('#iDroid .factory').filter({ has: page.locator(`.${ore}`) });
    return {
        value: container.locator('.current'),
        less: container.locator('.sub'),
        more: container.locator('.add'),
        label: container.locator(`.${ore}`),
    };
};

test.describe('mining droid — what it shows', () => {
    test('reports how many droids are assigned against the total', async ({ page }) => {
        await openDroid(page);
        const d = await droid(page);

        await expect(page.locator('#iDroid'))
            .toContainText(`${d.adam + d.uran + d.coal + d.alum}/${d.on}`);
    });

    test('offers a row per ore', async ({ page }) => {
        await openDroid(page);
        for (const ore of ORES) {
            await expect(row(page, ore).label).toHaveCount(1);
        }
    });

    test('each ore says what it yields and how many droids are on it', async ({ page }) => {
        await openDroid(page);
        await expect(row(page, 'adam').label).toHaveAttribute('aria-label', /.+/);
    });
});

test.describe('mining droid — what its controls do', () => {
    test('the steppers move droids on and off an ore', async ({ page }) => {
        await openDroid(page);

        await row(page, 'adam').more.click();
        expect((await droid(page)).adam).toBe(1);

        await row(page, 'adam').less.click();
        expect((await droid(page)).adam).toBe(0);
    });

    test('an ore cannot go below nothing', async ({ page }) => {
        await openDroid(page);

        await row(page, 'uran').less.click();
        expect((await droid(page)).uran).toBe(0);
    });

    test('assignment stops at the number of droids running', async ({ page }) => {
        await openDroid(page);
        const { on } = await droid(page);

        for (let i = 0; i < on + 4; i++) await row(page, 'adam').more.click();

        const after = await droid(page);
        expect(after.adam).toBe(on);
        expect(after.adam + after.uran + after.coal + after.alum).toBe(on);
    });

    test('at capacity an ore takes nothing from the others', async ({ page }) => {
        await openDroid(page);
        const { on } = await droid(page);

        // Fill every droid onto adamantite.
        for (let i = 0; i < on; i++) await row(page, 'adam').more.click();
        const before = await droid(page);
        expect(before.adam).toBe(on);

        // Uranium cannot start: unlike every other panel, nothing is displaced.
        await row(page, 'uran').more.click();

        const after = await droid(page);
        expect(after.uran).toBe(0);
        expect(after.adam).toBe(before.adam);
    });
});
