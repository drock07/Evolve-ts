import { test, expect, type Page } from '@playwright/test';
import { bootGame, runTicks, loadSaveFixture } from './harness';

/**
 * Behavioural baseline for the market row — resources.ts marketItem().
 *
 * Written against the legacy Vue implementation before porting it. Like
 * setAction, this is one renderer instantiated many times — twenty rows in
 * this save, one per tradeable resource — so it carries the same leverage and
 * the same risk.
 *
 * It is also the first panel to depend on Buefy: the route steppers are
 * wrapped in <b-tooltip>. Those are the descriptions asserted on below, and
 * they are why porting this row makes progress on Buefy as well as Vue.
 */

const SAVE = 'orc-midgame-1.2.20';
const RES = 'Lumber';

async function openMarket(page: Page): Promise<void> {
    await bootGame(page, { save: loadSaveFixture(SAVE) });
    await runTicks(page, 50);
    await page.locator('.tabs').first().locator('li').nth(4).click();
    await page.locator('#mTabResource .tabs li').nth(0).click();
    await expect(page.locator(`#market-${RES}`)).toBeVisible();
}

/** Engine state the row reads and writes. */
function market(page: Page, res: string) {
    return page.evaluate(r => {
        const g = (window as any).__evolveTest__.global;
        return {
            amount: g.resource[r].amount as number,
            trade: g.resource[r].trade as number,
            money: g.resource.Money.amount as number,
            routes: g.city.market.trade as number,
            maxRoutes: g.city.market.mtrade as number,
        };
    }, res);
}

const row = (page: Page, res = RES) => page.locator(`#market-${res}`);
/** Buy is the first .order, sell the second — the legacy order. */
const buyPrice = (page: Page, res = RES) => row(page, res).locator('.order').first();
const sellPrice = (page: Page, res = RES) => row(page, res).locator('.order').nth(1);

test.describe('market row — what it shows', () => {
    test('renders a row per tradeable resource', async ({ page }) => {
        await openMarket(page);
        expect(await page.locator('[id^="market-"].market-item').count()).toBeGreaterThan(10);
    });

    test('names the resource and prices it both ways', async ({ page }) => {
        await openMarket(page);

        await expect(row(page).locator('h3.res')).toHaveText(RES);
        await expect(row(page).locator('.buy')).toContainText('BUY');
        await expect(row(page).locator('.sell')).toContainText('SELL');
        // Both prices are money figures.
        await expect(buyPrice(page)).toHaveText(/^\$[\d,.KMG]+$/);
        await expect(sellPrice(page)).toHaveText(/^\$[\d,.KMG]+$/);
    });

    test('buying costs more than selling returns', async ({ page }) => {
        await openMarket(page);

        const parse = async (l: ReturnType<typeof buyPrice>) =>
            Number((await l.textContent())!.replace(/[$,]/g, ''));
        // The sell price is a fraction of the buy price; that spread is the
        // whole of the market's economics.
        expect(await parse(buyPrice(page))).toBeGreaterThan(await parse(sellPrice(page)));
    });

    test('shows the route count and a way to cancel them', async ({ page }) => {
        await openMarket(page);
        const state = await market(page, RES);

        await expect(row(page).locator('.trade .current')).toHaveText(String(state.trade));
        await expect(row(page).locator('.zero')).toBeVisible();
    });

    test('the route steppers describe their rates', async ({ page }) => {
        await openMarket(page);

        // Buefy renders the label into a tooltip-content node.
        const labels = await row(page).locator('.b-tooltip .tooltip-content').allTextContents();
        expect(labels.join(' ')).toMatch(/Auto-sell/);
        expect(labels.join(' ')).toMatch(/Auto-buy/);
    });
});

test.describe('market row — what its controls do', () => {
    test('clicking the buy price buys the resource', async ({ page }) => {
        await openMarket(page);
        const before = await market(page, RES);

        await buyPrice(page).click();

        const after = await market(page, RES);
        expect(after.amount).toBeGreaterThan(before.amount);
        expect(after.money).toBeLessThan(before.money);
    });

    test('clicking the sell price sells it', async ({ page }) => {
        await openMarket(page);
        const before = await market(page, RES);

        await sellPrice(page).click();

        const after = await market(page, RES);
        expect(after.amount).toBeLessThan(before.amount);
        expect(after.money).toBeGreaterThan(before.money);
    });

    test('the route steppers open import and export routes', async ({ page }) => {
        await openMarket(page);
        const before = await market(page, RES);
        expect(before.trade).toBe(0);

        await row(page).locator('.trade .add').click();
        expect((await market(page, RES)).trade).toBe(1);

        // Back to nothing, then the other way: a negative route exports.
        await row(page).locator('.trade .sub').click();
        expect((await market(page, RES)).trade).toBe(0);

        await row(page).locator('.trade .sub').click();
        expect((await market(page, RES)).trade).toBe(-1);
    });

    test('import routes are capped by the total the market supports', async ({ page }) => {
        await openMarket(page);
        const before = await market(page, RES);

        for (let i = 0; i < before.maxRoutes + 3; i++) {
            await row(page).locator('.trade .add').click();
        }

        const after = await market(page, RES);
        expect(after.routes).toBeLessThanOrEqual(after.maxRoutes);
        expect(after.trade).toBeLessThanOrEqual(before.maxRoutes);
    });

    test('cancelling routes returns the row to nothing', async ({ page }) => {
        await openMarket(page);

        await row(page).locator('.trade .add').click();
        await row(page).locator('.trade .add').click();
        expect((await market(page, RES)).trade).toBeGreaterThan(0);

        await row(page).locator('.zero').click();
        expect((await market(page, RES)).trade).toBe(0);
    });
});
