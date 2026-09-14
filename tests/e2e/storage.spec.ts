import { test, expect, type Page } from '@playwright/test';
import { bootGame, runTicks, loadSaveFixture } from './harness';

/**
 * Behavioural baseline for the storage row — resources.ts containerItem().
 *
 * One renderer per storable resource, twenty-three rows in this save. Each
 * assigns crates and containers out of a global pool, and what makes it worth
 * pinning carefully is that assigning does not merely move a number: it draws
 * from the unassigned pool and raises that resource's storage cap by the
 * crate's worth. Get the port wrong and caps drift.
 *
 * Reachable without seeding, though the save has no unassigned crates, so the
 * pool is topped up before the tests that spend from it.
 */

const SAVE = 'orc-midgame-1.2.20';
const RES = 'Lumber';

async function openStorage(page: Page): Promise<void> {
    await bootGame(page, { save: loadSaveFixture(SAVE) });
    await runTicks(page, 50);
    await page.locator('.tabs').first().locator('li').nth(4).click();
    await page.locator('#mTabResource .tabs li').nth(1).click();
    await expect(page.locator(`#stack-${RES}`)).toBeVisible();
}

/** Give the player spare crates and containers to assign. */
async function stockPool(page: Page, n = 10): Promise<void> {
    await page.evaluate(count => {
        const g = (window as any).__evolveTest__.global;
        g.resource.Crates.amount = count;
        g.resource.Containers.amount = count;
    }, n);
    await runTicks(page, 1);
}

function storage(page: Page, res: string) {
    return page.evaluate(r => {
        const g = (window as any).__evolveTest__.global;
        return {
            crates: g.resource[r].crates as number,
            containers: g.resource[r].containers as number,
            max: g.resource[r].max as number,
            poolCrates: g.resource.Crates.amount as number,
            poolContainers: g.resource.Containers.amount as number,
        };
    }, res);
}

/** The Crate group is first in a row, the Container group second. */
function group(page: Page, which: 'crate' | 'container', res = RES) {
    const container = page.locator(`#stack-${res} .trade`).nth(which === 'crate' ? 0 : 1);
    return {
        value: container.locator('.current'),
        less: container.locator('.sub'),
        more: container.locator('.add'),
    };
}

test.describe('storage row — what it shows', () => {
    test('renders a row per storable resource', async ({ page }) => {
        await openStorage(page);
        expect(await page.locator('[id^="stack-"]').count()).toBeGreaterThan(10);
    });

    test('names the resource and offers both kinds of storage', async ({ page }) => {
        await openStorage(page);

        await expect(page.locator(`#stack-${RES} h3.res`)).toHaveText(RES);
        await expect(page.locator(`#stack-${RES} .trade`)).toHaveCount(2);
        await expect(page.locator(`#stack-${RES} .trade`).first()).toContainText('Crate');
        await expect(page.locator(`#stack-${RES} .trade`).nth(1)).toContainText('Container');
    });

    test('the counts shown match the engine', async ({ page }) => {
        await openStorage(page);
        const s = await storage(page, RES);

        await expect(group(page, 'crate').value).toHaveText(String(s.crates));
        await expect(group(page, 'container').value).toHaveText(String(s.containers));
    });

    test('the steppers say which resource and kind they act on', async ({ page }) => {
        await openStorage(page);

        await expect(group(page, 'crate').more)
            .toHaveAttribute('aria-label', `add ${RES} Crate`);
        await expect(group(page, 'container').less)
            .toHaveAttribute('aria-label', `remove ${RES} Container`);
    });
});

test.describe('storage row — what its controls do', () => {
    test('assigning a crate spends one from the pool and raises the cap', async ({ page }) => {
        await openStorage(page);
        await stockPool(page);
        const before = await storage(page, RES);

        await group(page, 'crate').more.click();

        const after = await storage(page, RES);
        expect(after.crates).toBe(before.crates + 1);
        expect(after.poolCrates).toBe(before.poolCrates - 1);
        // The point of a crate: the resource can hold more than it could.
        expect(after.max).toBeGreaterThan(before.max);
    });

    test('unassigning returns it to the pool and lowers the cap again', async ({ page }) => {
        await openStorage(page);
        await stockPool(page);

        await group(page, 'crate').more.click();
        const assigned = await storage(page, RES);

        await group(page, 'crate').less.click();

        const after = await storage(page, RES);
        expect(after.crates).toBe(assigned.crates - 1);
        expect(after.poolCrates).toBe(assigned.poolCrates + 1);
        expect(after.max).toBeLessThan(assigned.max);
    });

    test('nothing is assigned when the pool is empty', async ({ page }) => {
        await openStorage(page);
        await page.evaluate(() => {
            (window as any).__evolveTest__.global.resource.Crates.amount = 0;
        });
        await runTicks(page, 1);
        const before = await storage(page, RES);

        await group(page, 'crate').more.click();

        const after = await storage(page, RES);
        expect(after.crates).toBe(before.crates);
        expect(after.max).toBe(before.max);
    });

    test('a resource cannot give back storage it never had', async ({ page }) => {
        await openStorage(page);
        const before = await storage(page, RES);
        expect(before.crates).toBe(0);

        await group(page, 'crate').less.click();

        const after = await storage(page, RES);
        expect(after.crates).toBe(0);
        expect(after.poolCrates).toBe(before.poolCrates);
    });

    test('containers work the same way, from their own pool', async ({ page }) => {
        await openStorage(page);
        await stockPool(page);
        const before = await storage(page, RES);

        await group(page, 'container').more.click();

        const after = await storage(page, RES);
        expect(after.containers).toBe(before.containers + 1);
        expect(after.poolContainers).toBe(before.poolContainers - 1);
        // Assigning a container leaves the crate pool alone.
        expect(after.poolCrates).toBe(before.poolCrates);
    });
});
