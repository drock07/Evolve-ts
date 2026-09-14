import { test, expect, type Page } from '@playwright/test';
import { bootGame, runTicks, loadSaveFixture } from './harness';

/**
 * Behavioural baseline for the storage construction header — the two buttons
 * above the storage rows, in resources.ts.
 *
 * Small, and the last <b-tooltip> pair in the Resources tab: each button wraps
 * itself in one to describe what the thing costs and how much it holds.
 */

const SAVE = 'orc-midgame-1.2.20';

async function openStorage(page: Page): Promise<void> {
    await bootGame(page, { save: loadSaveFixture(SAVE) });
    await runTicks(page, 50);
    await page.locator('.tabs').first().locator('li').nth(4).click();
    await page.locator('#mTabResource .tabs li').nth(1).click();
    await expect(page.locator('#createHead')).toBeVisible();
}

const stock = (page: Page) => page.evaluate(() => {
    const g = (window as any).__evolveTest__.global;
    return {
        crates: g.resource.Crates.amount as number,
        containers: g.resource.Containers.amount as number,
        plywood: g.resource.Plywood?.amount as number,
    };
});

test.describe('storage construction', () => {
    test('offers a button for each kind of storage', async ({ page }) => {
        await openStorage(page);

        await expect(page.locator('#createHead .crate button')).toBeVisible();
        await expect(page.locator('#createHead .container button')).toBeVisible();
    });

    test('each button describes what it costs and what it holds', async ({ page }) => {
        await openStorage(page);

        // The description doubles as the accessible label.
        await expect(page.locator('#createHead .crate button'))
            .toHaveAttribute('aria-label', /costs .* storage/s);
        await expect(page.locator('#createHead .container button'))
            .toHaveAttribute('aria-label', /costs .* storage/s);
    });

    test('constructing a crate produces one', async ({ page }) => {
        await openStorage(page);
        await page.evaluate(() => {
            const g = (window as any).__evolveTest__.global;
            // Afford it outright.
            for (const r of ['Plywood', 'Lumber', 'Steel']) {
                if (g.resource[r]) {
                    g.resource[r].max = Math.max(g.resource[r].max, 1e9);
                    g.resource[r].amount = 1e9;
                }
            }
        });
        await runTicks(page, 1);
        const before = await stock(page);

        await page.locator('#createHead .crate button').click();

        expect((await stock(page)).crates).toBe(before.crates + 1);
    });

    test('constructing a container produces one', async ({ page }) => {
        await openStorage(page);
        await page.evaluate(() => {
            const g = (window as any).__evolveTest__.global;
            for (const r of ['Steel', 'Plywood']) {
                if (g.resource[r]) {
                    g.resource[r].max = Math.max(g.resource[r].max, 1e9);
                    g.resource[r].amount = 1e9;
                }
            }
        });
        await runTicks(page, 1);
        const before = await stock(page);

        await page.locator('#createHead .container button').click();

        expect((await stock(page)).containers).toBe(before.containers + 1);
    });

    test('nothing is produced when it cannot be paid for', async ({ page }) => {
        await openStorage(page);
        await page.evaluate(() => {
            const g = (window as any).__evolveTest__.global;
            for (const r of Object.keys(g.resource)) {
                if (typeof g.resource[r]?.amount === 'number') g.resource[r].amount = 0;
            }
        });
        await runTicks(page, 1);
        const before = await stock(page);

        await page.locator('#createHead .crate button').click();

        expect((await stock(page)).crates).toBe(before.crates);
    });
});
