import { test, expect, type Page } from '@playwright/test';
import { bootGame, runTicks, loadSaveFixture } from './harness';

/**
 * Behavioural baseline for the foundry (crafters) panel — Civics > Government.
 *
 * Written against the legacy Vue implementation before porting.
 *
 * Assigning a crafter is a three-way move: a worker leaves the default job,
 * joins civic.craftsman, and is recorded against a specific craftable in
 * city.foundry. All four numbers have to move together, which is the main
 * thing these tests pin.
 *
 * Two craftables have their own caps — Scarletite via the hell forge and
 * Quantium via the zero-g lab — and this fixture has neither built, so those
 * paths are ported from the code rather than covered here. Noted rather than
 * pretended otherwise.
 */

const SAVE = 'orc-midgame-1.2.20';

async function openCivics(page: Page) {
    await bootGame(page, { save: loadSaveFixture(SAVE) });
    await runTicks(page, 50);
    await page.locator('.tabs li').nth(2).click();
    await expect(page.locator('#foundry')).toBeVisible();
}

function state(page: Page) {
    return page.evaluate(() => {
        const g = (window as any).__evolveTest__.global;
        return {
            crafting: g.city.foundry.crafting as number,
            plywood: g.city.foundry.Plywood as number,
            craftsmen: g.civic.craftsman.workers as number,
            max: g.civic.craftsman.max as number,
            dJobWorkers: g.civic[g.civic.d_job].workers as number,
        };
    });
}

test.describe('foundry panel', () => {
    test('renders the assigned header and one row per displayed craftable', async ({ page }) => {
        await openCivics(page);
        const foundry = page.locator('#foundry');

        await expect(foundry.locator('.foundry.job_label h3')).toHaveText('Crafters Assigned');
        const s = await state(page);
        await expect(foundry.locator('.foundry.job_label .count'))
            .toHaveText(`${s.crafting} / ${s.max}`);

        // Only unlocked craftables appear, in list order.
        const ids = await foundry.locator('[id^=craft]').evaluateAll(els => els.map(e => e.id));
        expect(ids).toEqual([
            'craftPlywood', 'craftBrick', 'craftWrought_Iron',
            'craftSheet_Metal', 'craftMythril',
        ]);
    });

    test('a craftable row shows its name, count and labelled controls', async ({ page }) => {
        await openCivics(page);
        const row = page.locator('#craftPlywood');

        await expect(row.locator('h3')).toHaveText('Plywood');
        await expect(row.locator('h3')).toHaveClass(/has-text-danger/);
        await expect(row.locator('.count')).toHaveText(String((await state(page)).plywood));

        const controls = page.locator('#craftPlywood').locator('xpath=following-sibling::div[@class="controls"]');
        await expect(controls.locator('.sub')).toHaveAttribute('aria-label', 'remove Plywood crafter');
        await expect(controls.locator('.add')).toHaveAttribute('aria-label', 'add Plywood crafter');
    });

    test('assigning a crafter moves all four counters together', async ({ page }) => {
        await openCivics(page);
        const before = await state(page);
        const controls = page.locator('#craftPlywood').locator('xpath=following-sibling::div[@class="controls"]');

        await controls.locator('.add').click();
        const after = await state(page);

        expect(after.plywood, 'craftable count').toBe(before.plywood + 1);
        expect(after.crafting, 'total crafting').toBe(before.crafting + 1);
        expect(after.craftsmen, 'craftsman workers').toBe(before.craftsmen + 1);
        expect(after.dJobWorkers, 'taken from the default job').toBe(before.dJobWorkers - 1);
        await expect(page.locator('#craftPlywood .count')).toHaveText(String(after.plywood));

        await controls.locator('.sub').click();
        expect(await state(page)).toEqual(before);
    });

    test('crafters stop at the craftsman cap', async ({ page }) => {
        await openCivics(page);
        const controls = page.locator('#craftPlywood').locator('xpath=following-sibling::div[@class="controls"]');

        const { max } = await state(page);
        // Well past the cap; assignment must stop cleanly.
        for (let i = 0; i < max + 10; i++) await controls.locator('.add').click();

        const after = await state(page);
        expect(after.crafting, 'crafting exceeded the craftsman cap').toBeLessThanOrEqual(max);
        expect(after.dJobWorkers, 'default job went negative').toBeGreaterThanOrEqual(0);
    });
});
