import { test, expect, type Page } from '@playwright/test';
import { bootGame, runTicks, loadSaveFixture } from './harness';

/**
 * Behavioural baseline for the smelter panel — industry.ts loadSmelter().
 *
 * Written against the legacy Vue implementation before porting it.
 *
 * The smelter is the first of twelve industry panels and the pattern for the
 * rest: a pool of built structures distributed across options by « and »
 * steppers, with a running total against a cap. Getting its shape right is
 * what makes the other eleven cheap, so it is pinned carefully.
 *
 * It is reached through the structure button's options modal, which is React's
 * as of the setAction port — the panel inside it is still legacy, drawn into
 * the empty #modalBox React provides.
 */

const SAVE = 'orc-midgame-1.2.20';

async function openSmelter(page: Page): Promise<void> {
    await bootGame(page, { save: loadSaveFixture(SAVE) });
    await runTicks(page, 50);
    await page.locator('.tabs').first().locator('li').nth(1).click();
    await page.locator('#city-smelter .special').click();
    await expect(page.locator('#specialModal')).toBeVisible();
}

/** The engine's smelter record. */
function smelter(page: Page) {
    return page.evaluate(() => {
        const s = (window as any).__evolveTest__.global.city.smelter;
        return {
            count: s.count as number, cap: s.cap as number,
            Wood: s.Wood as number, Coal: s.Coal as number, Oil: s.Oil as number,
            Iron: s.Iron as number, Steel: s.Steel as number,
        };
    });
}

/** A stepper pair within a row, addressed by the option's class. */
function stepper(page: Page, container: string, option: string) {
    const current = page.locator(`${container} .current.${option}`);
    return {
        current,
        less: current.locator('xpath=preceding-sibling::span[@role="button"][1]'),
        more: current.locator('xpath=following-sibling::span[@role="button"][1]'),
    };
}

test.describe('smelter panel — what it shows', () => {
    test('reports how many smelters are fuelled against the total', async ({ page }) => {
        await openSmelter(page);
        const s = await smelter(page);

        await expect(page.locator('#specialModal').first())
            .toContainText(`${s.Wood + s.Coal + s.Oil}/${s.count}`);
    });

    test('offers a row per fuel and per smelted material', async ({ page }) => {
        await openSmelter(page);

        for (const fuel of ['wood', 'coal', 'oil']) {
            await expect(page.locator(`#mSmelterFuels .current.${fuel}`)).toHaveCount(1);
        }
        for (const mat of ['iron', 'steel']) {
            await expect(page.locator(`#mSmelterMats .current.${mat}`)).toHaveCount(1);
        }
    });

    test('each option describes what it costs and how many are on it', async ({ page }) => {
        await openSmelter(page);

        // The aria-label is the description; it carries the rate and the count.
        await expect(page.locator('#mSmelterFuels .current.coal'))
            .toHaveAttribute('aria-label', /Coal/);
        await expect(page.locator('#mSmelterMats .current.iron'))
            .toHaveAttribute('aria-label', /Iron/);
    });

    test('the counts shown match the engine', async ({ page }) => {
        await openSmelter(page);
        const s = await smelter(page);

        await expect(page.locator('#mSmelterFuels .current.coal')).toContainText(String(s.Coal));
        await expect(page.locator('#mSmelterMats .current.iron')).toContainText(String(s.Iron));
        await expect(page.locator('#mSmelterMats .current.steel')).toContainText(String(s.Steel));
    });
});

test.describe('smelter panel — what its controls do', () => {
    test('the fuel steppers move smelters between fuels', async ({ page }) => {
        await openSmelter(page);
        const before = await smelter(page);
        expect(before.Coal).toBeGreaterThan(0);

        await stepper(page, '#mSmelterFuels', 'coal').less.click();
        expect((await smelter(page)).Coal).toBe(before.Coal - 1);

        await stepper(page, '#mSmelterFuels', 'coal').more.click();
        expect((await smelter(page)).Coal).toBe(before.Coal);
    });

    test('a fuel cannot be reduced below nothing', async ({ page }) => {
        await openSmelter(page);
        expect((await smelter(page)).Wood).toBe(0);

        await stepper(page, '#mSmelterFuels', 'wood').less.click();
        expect((await smelter(page)).Wood).toBe(0);
    });

    test('reducing a material leaves a smelter idle rather than reassigning it', async ({ page }) => {
        await openSmelter(page);
        const before = await smelter(page);
        expect(before.Steel).toBeGreaterThan(0);

        await stepper(page, '#mSmelterMats', 'steel').less.click();

        const after = await smelter(page);
        expect(after.Steel).toBe(before.Steel - 1);
        // The freed smelter is not handed to iron; it becomes slack that the
        // next increase can take up.
        expect(after.Iron).toBe(before.Iron);
    });

    test('a material at capacity takes its smelter from another', async ({ page }) => {
        await openSmelter(page);
        const before = await smelter(page);
        // Everything built is already allocated, so there is no slack.
        expect(before.Iron + before.Steel).toBe(before.count);

        await stepper(page, '#mSmelterMats', 'iron').more.click();

        const after = await smelter(page);
        expect(after.Iron).toBe(before.Iron + 1);
        // Iron is the first source addMetal draws from, so with iron itself the
        // target it comes from steel instead.
        expect(after.Steel).toBe(before.Steel - 1);
        expect(after.Iron + after.Steel).toBe(before.count);
    });

    test('smelting allocation stays within the fuelled total', async ({ page }) => {
        await openSmelter(page);
        const before = await smelter(page);

        // Push everything at iron; it cannot exceed what is built.
        for (let i = 0; i < before.count + 4; i++) {
            await stepper(page, '#mSmelterMats', 'iron').more.click();
        }
        const after = await smelter(page);
        expect(after.Iron + after.Steel).toBeLessThanOrEqual(before.count);
        expect(after.Iron).toBeGreaterThanOrEqual(before.Iron);
    });

    test('the panel repaints as the allocation changes', async ({ page }) => {
        await openSmelter(page);
        const before = await smelter(page);

        await stepper(page, '#mSmelterMats', 'steel').less.click();
        await expect(page.locator('#mSmelterMats .current.steel'))
            .toContainText(String(before.Steel - 1));
    });
});

/**
 * The same panel renders in the Industry tab.
 *
 * One component, two targets, differing only in the element ids the
 * stylesheet hangs off — the same arrangement the garrison has. The baseline
 * above reaches the panel through the options modal, so this covers the other
 * target, which is what a port collapses by accident.
 */
test.describe('the smelter also renders in the Industry tab', () => {
    async function openIndustry(page: Page): Promise<void> {
        await bootGame(page, { save: loadSaveFixture(SAVE) });
        await runTicks(page, 50);
        await page.locator('.tabs').first().locator('li').nth(2).click();
        await page.locator('#mTabCivic .tabs li').nth(1).click();
        await expect(page.locator('#smelterFuels')).toBeVisible();
    }

    test('renders the same rows under the tab-specific ids', async ({ page }) => {
        await openIndustry(page);

        for (const fuel of ['wood', 'coal', 'oil']) {
            await expect(page.locator(`#smelterFuels .current.${fuel}`)).toHaveCount(1);
        }
        for (const mat of ['iron', 'steel']) {
            await expect(page.locator(`#smelterMats .current.${mat}`)).toHaveCount(1);
        }
    });

    test('its steppers drive the same engine state', async ({ page }) => {
        await openIndustry(page);
        const before = await smelter(page);

        await stepper(page, '#mSmelterFuels, #smelterFuels', 'coal').less.click();
        expect((await smelter(page)).Coal).toBe(before.Coal - 1);
    });

    test('each row describes itself on hover', async ({ page }) => {
        await openIndustry(page);

        await page.locator('#smelterFuels .current.coal').hover();
        await expect(page.locator('.popper')).toHaveCount(1);
        await expect(page.locator('.popper')).toContainText(/Coal/);
    });
});
