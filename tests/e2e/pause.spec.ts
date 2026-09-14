import { test, expect } from '@playwright/test';
import { bootGame, loadSaveFixture } from './harness';

/**
 * The pause button, and the loop it is not allowed to start twice.
 *
 * Pausing does not stop the web worker — the loops simply skip their work
 * while global.settings.pause is set — so webWorker.s stays true the whole
 * time the game is paused. The legacy handler guarded on that before starting
 * the loop; the React port dropped the guard, and starting an already-started
 * worker is not idempotent: its 'start' case overwrites the timer id without
 * clearing the previous timer, and the timer re-arms itself. Every unpause
 * left another self-perpetuating tick chain running, so the game got
 * permanently faster each time the player paused and resumed.
 *
 * Nothing about that is visible in a snapshot — the state is identical, it
 * just advances at the wrong rate — which is why it is asserted on the
 * messages sent to the worker rather than on the game state.
 */

const SAVE = 'orc-midgame-1.2.20';

/**
 * Start counting 'start' messages posted to the worker.
 *
 * Under the test driver webWorker.w is a stub that delivers no ticks (see
 * engine/useGameEngine.ts), which is what makes this countable: the assertion
 * is about how many times the loop was asked to start, and a real worker would
 * answer by running the game underneath the test.
 */
async function watchWorkerStarts(page: import('@playwright/test').Page): Promise<void> {
    await page.evaluate(() => {
        const hooks = (window as any).__evolveTest__;
        const worker = hooks.webWorker.w;
        (window as any).__starts__ = 0;
        const original = worker.postMessage.bind(worker);
        worker.postMessage = (msg: any) => {
            if (msg && msg.loop === 'start') (window as any).__starts__++;
            return original(msg);
        };
    });
}

const workerStarts = (page: import('@playwright/test').Page) =>
    page.evaluate(() => (window as any).__starts__ as number);

/**
 * Pause and resume once, through the button.
 *
 * Deliberately not by setting global.settings.pause: writing it from outside
 * does not notify React, so the button would still be labelled Pause and the
 * test would be clicking something other than what a player clicks.
 */
async function pauseAndResume(page: import('@playwright/test').Page): Promise<void> {
    await page.locator('[aria-label="Pause"]').click();
    await page.locator('[aria-label="Play"]').click();
}

test.describe('pause button', () => {
    test('resuming does not restart a loop that is already running', async ({ page }) => {
        await bootGame(page, { save: loadSaveFixture(SAVE) });

        // bootGame freezes the worker the same way pausing does: the timer is
        // cleared but the running flag stays set.
        expect(await page.evaluate(() => (window as any).__evolveTest__.webWorker.s)).toBe(true);

        await watchWorkerStarts(page);

        // Three full pause/resume cycles: one redundant start per resume was
        // the bug, so a single cycle would understate it.
        for (let i = 0; i < 3; i++) {
            await pauseAndResume(page);
        }

        expect(await workerStarts(page)).toBe(0);
    });

    test('resuming does start the loop when it is genuinely stopped', async ({ page }) => {
        await bootGame(page, { save: loadSaveFixture(SAVE) });

        await watchWorkerStarts(page);
        // gameLoop('stop') is what clears this; set it directly so the test
        // does not depend on the stop path it is not asserting about.
        await page.evaluate(() => { (window as any).__evolveTest__.webWorker.s = false; });

        await pauseAndResume(page);

        expect(await workerStarts(page)).toBe(1);
    });

    test('the button repaints immediately, without waiting for a tick', async ({ page }) => {
        await bootGame(page, { save: loadSaveFixture(SAVE) });

        // The worker is frozen, so nothing will repaint this but the click's
        // own notifyStateChange(). Pausing stops the loop that would otherwise
        // cover for a missing notify, which is what made this the worst case
        // of the class: the button could never show that it was paused.
        await expect(page.locator('#pausegame')).toHaveClass(/play/);

        await page.locator('[aria-label="Pause"]').click();
        await expect(page.locator('#pausegame')).toHaveClass(/pause/);

        await page.locator('[aria-label="Play"]').click();
        await expect(page.locator('#pausegame')).toHaveClass(/play/);
    });
});
