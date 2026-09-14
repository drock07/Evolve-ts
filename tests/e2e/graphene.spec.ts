import { test, expect, type Page } from '@playwright/test';
import { bootGame, runTicks, loadSaveFixture, unlockStructure } from './harness';

/**
 * Behavioural baseline for the graphene plant — industry.ts loadGraphene().
 *
 * The smelter's shape, in a different place: a pool of running plants fuelled
 * by lumber, coal or oil, with flat stepper siblings and a running total. It
 * is the third caller for AllocationRow, and the one that made promoting it
 * out of the smelter worth doing.
 *
 * Its rule at capacity is its own, and worth pinning because it is the least
 * obvious of the three: where the smelter walks a fixed order of donors and
 * the factory takes only from alloy, the graphene plant takes from whichever
 * of coal or oil is currently *smaller*, falling back to the other when the
 * smaller is already empty. That drives the lesser fuel to zero rather than
 * keeping the two level, which is the opposite of what the code reads like at
 * a glance — hence the test.
 *
 * Reached by seeding; no fixture unlocks interstellar. See unlockStructure().
 */

const SAVE = 'orc-midgame-1.2.20';

async function openGraphene(page: Page, count = 6): Promise<void> {
    await bootGame(page, { save: loadSaveFixture(SAVE) });
    await runTicks(page, 20);
    await unlockStructure(page, 'interstellar', 'g_factory', { count, on: count });
    await runTicks(page, 1);
    await page.locator('.tabs').first().locator('li').nth(2).click();
    await page.locator('#mTabCivic .tabs li').nth(1).click();
    await expect(page.locator('#iGraphene')).toBeVisible();
}

function plant(page: Page) {
    return page.evaluate(() => {
        const g = (window as any).__evolveTest__.global.interstellar.g_factory;
        return {
            on: g.on as number,
            Lumber: (g.Lumber ?? 0) as number,
            Coal: (g.Coal ?? 0) as number,
            Oil: (g.Oil ?? 0) as number,
        };
    });
}

const fuel = (page: Page, which: string) => {
    const current = page.locator(`#iGraphene .current.${which}`);
    return {
        current,
        less: current.locator('xpath=preceding-sibling::span[@role="button"][1]'),
        more: current.locator('xpath=following-sibling::span[@role="button"][1]'),
    };
};

test.describe('graphene plant — what it shows', () => {
    test('reports how many plants are fuelled against the total', async ({ page }) => {
        await openGraphene(page);
        const p = await plant(page);

        await expect(page.locator('#iGraphene'))
            .toContainText(`${p.Lumber + p.Coal + p.Oil}/${p.on}`);
    });

    test('offers a stepper pair per available fuel', async ({ page }) => {
        await openGraphene(page);

        for (const which of ['wood', 'coal', 'oil']) {
            await expect(page.locator(`#iGraphene .current.${which}`)).toHaveCount(1);
        }
    });

    test('each fuel says what it costs and how much is on it', async ({ page }) => {
        await openGraphene(page);
        await expect(page.locator('#iGraphene .current.coal'))
            .toHaveAttribute('aria-label', /.+/);
    });
});

test.describe('graphene plant — what its controls do', () => {
    test('the steppers fuel and unfuel plants', async ({ page }) => {
        await openGraphene(page);

        await fuel(page, 'coal').more.click();
        expect((await plant(page)).Coal).toBe(1);

        await fuel(page, 'coal').less.click();
        expect((await plant(page)).Coal).toBe(0);
    });

    test('a fuel cannot go below nothing', async ({ page }) => {
        await openGraphene(page);

        await fuel(page, 'wood').less.click();
        expect((await plant(page)).Lumber).toBe(0);
    });

    test('fuelling stops at the number of plants running', async ({ page }) => {
        await openGraphene(page);
        const { on } = await plant(page);

        for (let i = 0; i < on + 4; i++) await fuel(page, 'coal').more.click();

        const after = await plant(page);
        expect(after.Lumber + after.Coal + after.Oil).toBeLessThanOrEqual(on);
        expect(after.Coal).toBe(on);
    });

    test('at capacity, a fuel takes from whichever rival is smaller', async ({ page }) => {
        await openGraphene(page);
        const { on } = await plant(page);

        // Fill with coal, then put one plant on oil so the two differ.
        for (let i = 0; i < on; i++) await fuel(page, 'coal').more.click();
        await fuel(page, 'oil').more.click();

        const before = await plant(page);
        expect(before.Coal).toBeGreaterThan(before.Oil);
        expect(before.Oil).toBeGreaterThan(0);

        // Adding lumber has to displace something. Oil is the smaller, so oil
        // is what goes — the larger fuel is left alone.
        await fuel(page, 'wood').more.click();

        const after = await plant(page);
        expect(after.Lumber).toBe(before.Lumber + 1);
        expect(after.Oil).toBe(before.Oil - 1);
        expect(after.Coal).toBe(before.Coal);
    });
});
