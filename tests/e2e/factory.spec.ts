import { test, expect, type Page } from '@playwright/test';
import { bootGame, runTicks, loadSaveFixture } from './harness';

/**
 * Behavioural baseline for the factory panel — industry.ts loadFactory().
 *
 * Second of the twelve industry panels, and a useful check on how far the
 * smelter's shape generalises: the same pool-against-a-cap idea, but laid out
 * as one row per product rather than as flat siblings, and with a different
 * rule for what happens at capacity — the factory steals only from Alloy,
 * where the smelter walks an order of donors.
 */

const SAVE = 'orc-midgame-1.2.20';

async function openFactory(page: Page): Promise<void> {
    await bootGame(page, { save: loadSaveFixture(SAVE) });
    await runTicks(page, 50);
    await page.locator('.tabs').first().locator('li').nth(1).click();
    await page.locator('#city-factory .special').click();
    await expect(page.locator('#specialModal')).toBeVisible();
}

function factory(page: Page) {
    return page.evaluate(() => {
        const f = (window as any).__evolveTest__.global.city.factory;
        return {
            count: f.count as number, on: f.on as number,
            Lux: f.Lux as number, Furs: f.Furs as number,
            Alloy: f.Alloy as number, Polymer: f.Polymer as number,
        };
    });
}

/** A product's row, addressed by the label's class. */
function row(page: Page, product: string) {
    const container = page.locator(`#specialModal .factory`).filter({ has: page.locator(`.${product}`) });
    return {
        value: container.locator('.current'),
        less: container.locator('.sub'),
        more: container.locator('.add'),
        label: container.locator(`.${product}`),
    };
}

test.describe('factory panel — what it shows', () => {
    test('reports how many factories are operating against the total', async ({ page }) => {
        await openFactory(page);
        const f = await factory(page);

        await expect(page.locator('#specialModal'))
            .toContainText(`${f.Lux + f.Furs + f.Alloy + f.Polymer}/${f.on}`);
    });

    test('offers a row per unlocked product', async ({ page }) => {
        await openFactory(page);

        for (const product of ['Lux', 'Furs', 'Alloy', 'Polymer']) {
            await expect(row(page, product).label).toHaveCount(1);
        }
    });

    test('each product says what it consumes and how many are on it', async ({ page }) => {
        await openFactory(page);

        await expect(row(page, 'Alloy').label)
            .toHaveAttribute('aria-label', /Consume.*Alloy.*factories producing Alloy/s);
    });

    test('the counts shown match the engine', async ({ page }) => {
        await openFactory(page);
        const f = await factory(page);

        await expect(row(page, 'Alloy').value).toHaveText(String(f.Alloy));
        await expect(row(page, 'Polymer').value).toHaveText(String(f.Polymer));
    });
});

test.describe('factory panel — what its controls do', () => {
    test('the steppers move factories on and off a product', async ({ page }) => {
        await openFactory(page);
        const before = await factory(page);
        expect(before.Alloy).toBeGreaterThan(0);

        await row(page, 'Alloy').less.click();
        expect((await factory(page)).Alloy).toBe(before.Alloy - 1);

        await row(page, 'Alloy').more.click();
        expect((await factory(page)).Alloy).toBe(before.Alloy);
    });

    test('a product cannot be reduced below nothing', async ({ page }) => {
        await openFactory(page);
        expect((await factory(page)).Lux).toBe(0);

        await row(page, 'Lux').less.click();
        expect((await factory(page)).Lux).toBe(0);
    });

    test('at capacity, adding to a product takes from Alloy', async ({ page }) => {
        await openFactory(page);
        const before = await factory(page);
        // Everything is allocated, so there is no slack to take up.
        expect(before.Lux + before.Furs + before.Alloy + before.Polymer).toBe(before.on);
        expect(before.Alloy).toBeGreaterThan(0);

        await row(page, 'Polymer').more.click();

        const after = await factory(page);
        expect(after.Polymer).toBe(before.Polymer + 1);
        expect(after.Alloy).toBe(before.Alloy - 1);
    });

    test('the panel repaints as the allocation changes', async ({ page }) => {
        await openFactory(page);
        const before = await factory(page);

        await row(page, 'Alloy').less.click();
        await expect(row(page, 'Alloy').value).toHaveText(String(before.Alloy - 1));
    });
});
