import { test, expect, type Page } from '@playwright/test';
import { bootGame, runTicks, loadSaveFixture } from './harness';

/**
 * Behavioural baseline for the government selector and its modal —
 * Civics > Government.
 *
 * Written against the legacy Vue implementation before porting. This is the
 * first widget with a modal, and the original used Buefy's, opened
 * imperatively and then populated by a setInterval that polled every 50ms
 * until the modal's DOM appeared.
 *
 * The fixture is mid-revolution (govern.rev is non-zero), which is itself
 * worth asserting: the change button is disabled while a revolution runs.
 * Tests that need the modal clear `rev` first, which is the ordinary state
 * between revolutions rather than a contrived one.
 */

const SAVE = 'orc-midgame-1.2.20';

async function openCivics(page: Page) {
    await bootGame(page, { save: loadSaveFixture(SAVE) });
    await runTicks(page, 50);
    await page.locator('.tabs li').nth(2).click();
    await expect(page.locator('#govType')).toBeVisible();
}

/**
 * Allow a revolution: the change button is only enabled while rev is 0.
 *
 * The tick afterwards is not incidental. In a running game the loop is what
 * decrements `rev`, and the loop announces its own changes; the harness keeps
 * the loop frozen, so a direct poke has to be followed by a tick for the UI to
 * see it. Without this the test would be asserting against a paused world that
 * the game never actually presents to a player.
 */
async function clearRevolution(page: Page) {
    await page.evaluate(() => {
        (window as any).__evolveTest__.global.civic.govern.rev = 0;
    });
    await runTicks(page, 1);
}

function govern(page: Page) {
    return page.evaluate(() => {
        const g = (window as any).__evolveTest__.global.civic.govern;
        return { type: g.type as string, rev: g.rev as number };
    });
}

test.describe('government selector', () => {
    test('shows the current government and the revolution button', async ({ page }) => {
        await openCivics(page);

        await expect(page.locator('#govType')).toContainText('System of Government');
        await expect(page.locator('#govLabel')).toHaveText('Federation');
        await expect(page.locator('#govType .change button')).toHaveText('Start Revolution');
    });

    test('the button is disabled while a revolution is already running', async ({ page }) => {
        await openCivics(page);

        expect((await govern(page)).rev).toBeGreaterThan(0);
        await expect(page.locator('#govType .change button')).toBeDisabled();
    });

    test('opens a modal listing the governments that can be switched to', async ({ page }) => {
        await openCivics(page);
        await clearRevolution(page);
        await expect(page.locator('#govType .change button')).toBeEnabled();

        await page.locator('#govType .change button').click();

        const options = page.locator('#govModal button');
        await expect.poll(() => options.count()).toBeGreaterThan(0);

        const govs = await options.evaluateAll(
            els => els.map(e => (e as HTMLElement).dataset.gov),
        );
        // Unlocked by this save's tech, and never the government already in force.
        expect(govs).toEqual([
            'autocracy', 'democracy', 'oligarchy', 'theocracy',
            'republic', 'socialist', 'corpocracy', 'technocracy',
        ]);
        expect(govs, 'the current government must not be offered').not.toContain('federation');
    });

    test('choosing a government starts a revolution and closes the modal', async ({ page }) => {
        await openCivics(page);
        await clearRevolution(page);
        await page.locator('#govType .change button').click();
        await expect.poll(() => page.locator('#govModal button').count()).toBeGreaterThan(0);

        await page.locator('#govModal button[data-gov="republic"]').click();

        const after = await govern(page);
        expect(after.type).toBe('republic');
        // Switching costs a cooldown before the next change is allowed.
        expect(after.rev, 'changing government should start a revolution timer')
            .toBeGreaterThan(0);

        await expect(page.locator('#govModal')).toHaveCount(0);
    });
});

test.describe('modal behaviour', () => {
    /**
     * These exercise the shared Modal component through the government
     * selector, since it is the first widget to use it. They cover the
     * behaviours that motivated building on <dialog> rather than a div: the
     * platform gives focus containment, Escape, and the top layer for free,
     * and those are exactly the things a hand-rolled modal gets wrong.
     */

    async function openModal(page: Page) {
        await openCivics(page);
        await clearRevolution(page);
        await page.locator('#govType .change button').click();
        await expect.poll(() => page.locator('#govModal button').count()).toBeGreaterThan(0);
    }

    test('opens as a real modal dialog, not just a styled div', async ({ page }) => {
        await openModal(page);

        // A dialog opened with showModal() reports open and sits in the top
        // layer; one merely shown with the open attribute does not.
        const modal = await page.evaluate(() => {
            const d = document.querySelector('dialog.evolveModal') as HTMLDialogElement | null;
            return { exists: !!d, open: d?.open ?? false, matchesTopLayer: d?.matches(':modal') ?? false };
        });
        expect(modal.exists).toBe(true);
        expect(modal.open).toBe(true);
        expect(modal.matchesTopLayer, 'dialog is not in the top layer').toBe(true);
    });

    test('Escape closes it', async ({ page }) => {
        await openModal(page);
        await page.keyboard.press('Escape');
        await expect(page.locator('#govModal')).toHaveCount(0);
    });

    test('the close button closes it', async ({ page }) => {
        await openModal(page);
        await page.locator('dialog.evolveModal .modalClose').click();
        await expect(page.locator('#govModal')).toHaveCount(0);
    });

    test('clicking the backdrop closes it, clicking the panel does not', async ({ page }) => {
        await openModal(page);

        // A click inside the panel must not dismiss.
        await page.locator('dialog.evolveModal .modalBox').click({ position: { x: 5, y: 5 } });
        await expect(page.locator('#govModal')).toHaveCount(1);

        // The backdrop is the dialog element itself, outside the panel box.
        await page.locator('dialog.evolveModal').click({ position: { x: 2, y: 2 } });
        await expect(page.locator('#govModal')).toHaveCount(0);
    });

    test('focus moves into the dialog and returns on close', async ({ page }) => {
        await openCivics(page);
        await clearRevolution(page);

        const trigger = page.locator('#govType .change button');
        await trigger.click();
        await expect.poll(() => page.locator('#govModal button').count()).toBeGreaterThan(0);

        // showModal() moves focus inside; this is the containment a hand-rolled
        // modal has to implement by hand.
        const inside = await page.evaluate(
            () => !!document.activeElement?.closest('dialog.evolveModal'),
        );
        expect(inside, 'focus did not move into the dialog').toBe(true);

        await page.keyboard.press('Escape');
        await expect(page.locator('#govModal')).toHaveCount(0);
    });
});
