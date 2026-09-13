import { test, expect, type Page } from '@playwright/test';
import { bootGame, runTicks, loadSaveFixture } from './harness';

/**
 * Behavioural baseline for the message-queue settings modal.
 *
 * Unlike the other baselines here, this one is written against an existing
 * *React* implementation rather than a Vue one: the message queue was ported
 * in the original migration and uses Headless UI's Dialog. The baseline exists
 * so that swapping it onto the shared <dialog>-based Modal can be shown to
 * change nothing a player can observe.
 *
 * Same rule as the others: assert what a player sees and does, never the
 * implementation. Nothing here mentions Headless UI or <dialog>.
 */

const SAVE = 'orc-midgame-1.2.20';

async function openQueueSettings(page: Page) {
    await bootGame(page, { save: loadSaveFixture(SAVE) });
    await runTicks(page, 50);
    await page.locator('#msgQueueHeader [title="message queue options"]').click();
}

/** The settings panel, identified by its heading rather than its container. */
function panel(page: Page) {
    return page.locator('.modalBody').filter({ has: page.locator('.msgInput') });
}

test.describe('message queue settings', () => {
    test('the gear opens a settings panel with per-filter controls', async ({ page }) => {
        await openQueueSettings(page);

        await expect(panel(page)).toBeVisible();
        // One visibility checkbox and one length field per unlocked filter.
        await expect(panel(page).locator('input[type="checkbox"]').first()).toBeVisible();
        await expect(panel(page).locator('input[type="number"]').first()).toBeVisible();
    });

    test('toggling a filter checkbox writes through to the engine', async ({ page }) => {
        await openQueueSettings(page);

        const box = panel(page).locator('input[type="checkbox"]').first();
        const before = await box.isChecked();
        await box.click();
        await expect(box).toBeChecked({ checked: !before });

        // The engine, not just the DOM, has to have changed.
        const anyChanged = await page.evaluate(prev => {
            const f = (window as any).__evolveTest__.global.settings.msgFilters;
            return Object.values(f).some((x: any) => x.vis === !prev);
        }, before);
        expect(anyChanged, 'no filter visibility changed in global.settings').toBe(true);
    });

    test('Escape closes it', async ({ page }) => {
        await openQueueSettings(page);
        await expect(panel(page)).toBeVisible();

        await page.keyboard.press('Escape');
        await expect(panel(page)).toHaveCount(0);
    });

    test('it can be reopened after closing', async ({ page }) => {
        await openQueueSettings(page);
        await page.keyboard.press('Escape');
        await expect(panel(page)).toHaveCount(0);

        await page.locator('#msgQueueHeader [title="message queue options"]').click();
        await expect(panel(page)).toBeVisible();
    });
});
