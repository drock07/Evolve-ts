import { test, expect, type Page } from '@playwright/test';
import { bootGame, runTicks, loadSaveFixture } from './harness';

/**
 * Behavioural baseline for the tax-rate control.
 *
 * Written against the legacy Vue implementation before porting it to React,
 * so that the port can be proved equivalent rather than merely looking right.
 * Every assertion here is deliberately about what a player can see and do —
 * markup, labels, and what a click changes — and not about how it is built.
 * The one detail specifically avoided is the `vb` class, which vBind adds and
 * React will not.
 *
 * Runs from the mid-game save: tax rates only exist once a government does.
 */

const SAVE = 'orc-midgame-1.2.20';

async function openCivics(page: Page) {
    await bootGame(page, { save: loadSaveFixture(SAVE) });
    await runTicks(page, 50);
    await page.locator('.tabs li').nth(2).click();
    await expect(page.locator('#tax_rates')).toBeVisible();
}

function rate(page: Page) {
    return page.evaluate(
        () => (window as any).__evolveTest__.global.civic.taxes.tax_rate as number,
    );
}

test.describe('tax rate control', () => {
    test('renders the label, both arrows and the current rate', async ({ page }) => {
        await openCivics(page);

        const panel = page.locator('#tax_rates');
        await expect(panel).toHaveClass(/taxRate/);

        await expect(panel.locator('h3#taxRateLabel')).toHaveText('Tax Rates');

        const sub = panel.locator('.sub');
        const add = panel.locator('.add');
        await expect(sub).toHaveAttribute('aria-label', 'decrease taxes');
        await expect(add).toHaveAttribute('aria-label', 'increase taxes');
        await expect(sub).toHaveAttribute('role', 'button');
        await expect(add).toHaveAttribute('role', 'button');
        await expect(sub).toHaveText('«');
        await expect(add).toHaveText('»');

        // The displayed value tracks the engine, formatted as a percentage.
        await expect(panel.locator('.current')).toHaveText(`${await rate(page)}%`);
    });

    test('the arrows raise and lower the rate by one step', async ({ page }) => {
        await openCivics(page);
        const panel = page.locator('#tax_rates');
        const start = await rate(page);

        await panel.locator('.add').click();
        await expect(panel.locator('.current')).toHaveText(`${start + 1}%`);
        expect(await rate(page)).toBe(start + 1);

        await panel.locator('.sub').click();
        await expect(panel.locator('.current')).toHaveText(`${start}%`);
        expect(await rate(page)).toBe(start);
    });

    test('the rate stops at its cap rather than running away', async ({ page }) => {
        await openCivics(page);
        const panel = page.locator('#tax_rates');

        // Well past any legitimate cap; the control must clamp.
        for (let i = 0; i < 60; i++) await panel.locator('.add').click();
        const high = await rate(page);

        await panel.locator('.add').click();
        expect(await rate(page), 'rate kept climbing past its cap').toBe(high);

        for (let i = 0; i < 80; i++) await panel.locator('.sub').click();
        const low = await rate(page);

        await panel.locator('.sub').click();
        expect(await rate(page), 'rate kept falling past its floor').toBe(low);

        expect(low).toBeLessThan(high);
    });
});

test.describe('island lifecycle', () => {
    test('switching tabs repeatedly does not leak React roots', async ({ page }) => {
        // Legacy code clears and rebuilds these containers on every tab switch,
        // so each visit hands the island a brand-new node. Without reaping the
        // roots whose containers are gone, this would grow without bound and
        // React would warn about rendering into detached trees.
        const errors: string[] = [];
        page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

        await openCivics(page);
        const after1 = await page.evaluate(() => (window as any).__evolveTest__.islandCount());

        for (let i = 0; i < 5; i++) {
            await page.locator('.tabs li').nth(1).click();
            await page.waitForTimeout(150);
            await page.locator('.tabs li').nth(2).click();
            await page.waitForTimeout(150);
        }

        const after6 = await page.evaluate(() => (window as any).__evolveTest__.islandCount());
        expect(after6, `islands grew from ${after1} to ${after6} over six visits`)
            .toBeLessThanOrEqual(after1 + 1);

        // The control must still work after all that rebuilding.
        await expect(page.locator('#tax_rates .current')).toBeVisible();

        const reactWarnings = errors.filter(e => /unmount|detached|createRoot|already been passed/i.test(e));
        expect(reactWarnings, `React root warnings:\n${reactWarnings.join('\n')}`).toEqual([]);
    });
});
