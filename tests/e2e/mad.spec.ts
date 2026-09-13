import { test, expect, type Page } from '@playwright/test';
import { bootGame, runTicks, loadSaveFixture } from './harness';

/**
 * Behavioural baseline for the Mutual Assured Destruction control.
 *
 * Written against the legacy Vue implementation before porting, so the port
 * can be proved equivalent rather than eyeballed.
 *
 * Read `armed` carefully: it means the opposite of what it says. `armed: false`
 * is the LIVE state — warhead() and launch() both guard on `!armed`, the
 * hazard-stripe class is applied then, and the button offers to disarm.
 * `armed: true` is safe, which is why launch binds :disabled="armed".
 *
 * The launch button is never clicked here. Launching resets the game.
 */

const SAVE = 'orc-midgame-1.2.20';

async function openMilitary(page: Page) {
    await bootGame(page, { save: loadSaveFixture(SAVE) });
    await runTicks(page, 50);
    await page.locator('.tabs li').nth(2).click();
    await page.locator('#mTabCivic .tabs li').filter({ hasText: 'Military' }).first().click();
    await expect(page.locator('#mad')).toBeVisible();
}

function armed(page: Page) {
    return page.evaluate(
        () => (window as any).__evolveTest__.global.civic.mad.armed as boolean,
    );
}

test.describe('MAD control', () => {
    test('renders the warning, both buttons, and starts safe', async ({ page }) => {
        await openMilitary(page);
        const mad = page.locator('#mad');

        await expect(mad).toHaveClass(/tile/);
        await expect(mad.locator('.warn')).toContainText('reset the game');
        await expect(mad.locator('.defcon.mdarm button.arm')).toHaveText('Arm Missiles');
        await expect(mad.locator('.defcon.mdlaunch button')).toHaveText('Launch Missiles');

        // The fixture is in the safe state, so launch must be unavailable and
        // the hazard styling absent.
        expect(await armed(page)).toBe(true);
        await expect(mad.locator('.defcon.mdlaunch button')).toBeDisabled();
        await expect(mad).not.toHaveClass(/armed/);
    });

    test('arming flips the label, the class and the launch button', async ({ page }) => {
        await openMilitary(page);
        const mad = page.locator('#mad');
        const armBtn = mad.locator('.defcon.mdarm button.arm');
        const launchBtn = mad.locator('.defcon.mdlaunch button');

        await armBtn.click();

        // Now live: armed goes FALSE, the hazard class appears, launch enables,
        // and the button offers to disarm.
        expect(await armed(page)).toBe(false);
        await expect(mad).toHaveClass(/armed/);
        await expect(armBtn).toHaveText('Disarm Missiles');
        await expect(launchBtn).toBeEnabled();

        // ...and back to safe.
        await armBtn.click();
        expect(await armed(page)).toBe(true);
        await expect(mad).not.toHaveClass(/armed/);
        await expect(armBtn).toHaveText('Arm Missiles');
        await expect(launchBtn).toBeDisabled();
    });
});
