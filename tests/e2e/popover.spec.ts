import { test, expect, type Page } from '@playwright/test';
import { bootGame, runTicks, loadSaveFixture } from './harness';

/**
 * Hover descriptions, across both popover systems.
 *
 * The legacy popover() and the React usePopover() render different DOM but
 * share one rule: at most one description is visible at a time. They keep it
 * by both going through clearPopper(), which empties the legacy #popper and
 * calls the closer the React side registers.
 *
 * The cross-system cases are the ones worth testing — each system enforcing
 * exclusion among its own is easy, and the two disagreeing would leave two
 * descriptions on screen with no error anywhere.
 *
 * The garrison is the test bed because it now has React descriptions sitting
 * next to legacy ones on the same panel.
 */

const SAVE = 'orc-midgame-1.2.20';

/** Any visible description, from either system. */
function poppers(page: Page) {
    return page.locator('.popper');
}

async function openCivics(page: Page): Promise<void> {
    await bootGame(page, { save: loadSaveFixture(SAVE) });
    await runTicks(page, 50);
    await page.locator('.tabs').first().locator('li').nth(2).click();
    await expect(page.locator('#c_garrison')).toBeVisible();
}

/**
 * Descriptions that had stopped appearing entirely.
 *
 * Each was a legacy popover bound by selector on the line after the React
 * island that renders its element was mounted. React renders asynchronously
 * where Vue rendered synchronously, so jQuery matched nothing and the binding
 * went to an element that did not exist yet — or, for the tax heading, to one
 * React replaced a moment later. No error, no popover, and nothing to notice
 * unless someone hovered.
 */
const REVIVED = [
    { name: 'government label', selector: '#govLabel', id: 'govLabel' },
    { name: 'change government button', selector: '#govType .change', id: 'govTypeChange' },
    { name: 'tax rates heading', selector: '#taxRateLabel', id: 'taxRateLabel' },
    // Found by the popover audit rather than by hand. Registered at module
    // scope, before React had rendered anything at all.
    { name: 'version number changelog', selector: '#versionLog', id: 'versionLog' },
];

test.describe('descriptions that had gone missing', () => {
    for (const target of REVIVED) {
        test(`the ${target.name} has one again`, async ({ page }) => {
            await openCivics(page);
            // #versionLog lives in the top bar, so it needs no particular tab;
            // openCivics is simply a booted page for it.

            await page.locator(target.selector).hover();
            await expect(poppers(page)).toHaveCount(1);
            await expect(poppers(page)).toHaveAttribute('data-id', target.id);
            await expect(poppers(page)).not.toBeEmpty();
        });
    }
});

test.describe('popovers', () => {
    test('a description appears on hover and goes away on leave', async ({ page }) => {
        await openCivics(page);

        await expect(poppers(page)).toHaveCount(0);

        await page.locator('#c_garrison .soldier').hover();
        await expect(poppers(page)).toHaveCount(1);

        // Somewhere harmless and far away, so the pointer is off the trigger.
        await page.locator('#topBar').hover();
        await expect(poppers(page)).toHaveCount(0);
    });

    test('moving between React triggers leaves only the newest showing', async ({ page }) => {
        await openCivics(page);

        await page.locator('#c_garrison .soldier').hover();
        await expect(poppers(page)).toHaveCount(1);

        await page.locator('#c_garrison .wounded').hover();
        await expect(poppers(page)).toHaveCount(1);
        await expect(poppers(page)).toHaveAttribute('data-id', 'cGarrisonwounded');
    });

    test('a legacy description closes an open React one', async ({ page }) => {
        await openCivics(page);

        await page.locator('#c_garrison .soldier').hover();
        await expect(poppers(page)).toHaveAttribute('data-id', 'cGarrisonsoldier');

        // #gov0 .attack is still legacy-bound, on the same panel.
        await page.locator('#gov0 .attack').hover();
        await expect(poppers(page)).toHaveCount(1);
        await expect(poppers(page)).not.toHaveAttribute('data-id', 'cGarrisonsoldier');
    });

    test('a React description closes an open legacy one', async ({ page }) => {
        await openCivics(page);

        await page.locator('#gov0 .attack').hover();
        await expect(poppers(page)).toHaveCount(1);

        await page.locator('#c_garrison .soldier').hover();
        await expect(poppers(page)).toHaveCount(1);
        await expect(poppers(page)).toHaveAttribute('data-id', 'cGarrisonsoldier');
    });

    test('descriptions are computed when shown, not baked in at render', async ({ page }) => {
        await openCivics(page);

        // The tactic description follows the selected tactic. If it were
        // captured at render time it would still read as siege here.
        await page.locator('#c_tactics .current.tactic').hover();
        await expect(poppers(page)).toContainText('siege', { ignoreCase: true });

        await page.locator('#topBar').hover();
        await page.locator('#c_tactics .sub').click();
        await page.locator('#c_tactics .current.tactic').hover();

        await expect(poppers(page)).not.toContainText('siege', { ignoreCase: true });
    });

    test('a description is positioned against its own trigger', async ({ page }) => {
        await openCivics(page);

        await page.locator('#c_garrison .hmerc').hover();
        await expect(poppers(page)).toHaveCount(1);

        const boxes = await page.evaluate(() => {
            const pop = document.querySelector('.popper')!.getBoundingClientRect();
            const trigger = document.querySelector('#c_garrison .hmerc')!.getBoundingClientRect();
            return { pop, trigger };
        });

        // Popper has placed it somewhere real rather than leaving it at 0,0 in
        // the corner, and near the control it belongs to.
        expect(boxes.pop.width).toBeGreaterThan(0);
        expect(Math.abs(boxes.pop.left - boxes.trigger.left)).toBeLessThan(400);
        expect(Math.abs(boxes.pop.top - boxes.trigger.top)).toBeLessThan(400);
    });
});
