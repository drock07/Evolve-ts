import { test, expect } from '@playwright/test';
import { bootGame, runTicks, loadSaveFixture } from './harness';

/**
 * UI regression coverage for the tab shell.
 *
 * Until this file existed the entire UI suite was three visibility assertions,
 * and the engine golden masters stayed green while every legacy tab rendered
 * nothing at all — the React TabGroup replaced mainVue without carrying over
 * its swapTab -> loadTab call. That is the class of regression this catches.
 *
 * It runs from the mid-game save, because a fresh game has almost no tab
 * content to speak of. Assertions are on substance rather than exact markup:
 * the legacy tabs are still Vue templates today and will become React
 * components during the port, so pinning their HTML would just have to be
 * rewritten tab by tab. What must stay true through that port is that each
 * tab renders, renders its own content, and throws nothing.
 */

const SAVE = 'orc-midgame-1.2.20';

/** Outer tab index -> panel id and a phrase that must appear in it. */
const TABS = [
    { index: 1, id: 'mTabCivil', label: 'City', contains: 'Town' },
    { index: 2, id: 'mTabCivic', label: 'Civics', contains: 'Government' },
    { index: 3, id: 'mTabResearch', label: 'Research', contains: 'Research' },
    { index: 4, id: 'mTabResource', label: 'Resources', contains: 'Market' },
] as const;

test.describe('tab shell', () => {
    test('every legacy tab renders content when selected', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', err => errors.push(String(err)));

        await bootGame(page, { save: loadSaveFixture(SAVE) });
        await runTicks(page, 50);

        for (const tab of TABS) {
            await page.locator('.tabs li').nth(tab.index).click();
            await expect
                .poll(
                    () => page.evaluate(
                        id => document.getElementById(id)?.innerHTML.length ?? 0,
                        tab.id,
                    ),
                    { message: `${tab.label} tab (#${tab.id}) never rendered any content` },
                )
                .toBeGreaterThan(1000);

            const text = await page.locator(`#${tab.id}`).textContent();
            expect(text, `${tab.label} tab content`).toContain(tab.contains);
        }

        expect(errors, `page errors:\n${errors.join('\n')}`).toEqual([]);
    });

    test('tabs still render after switching away and back', async ({ page }) => {
        // Panels are kept mounted (unmount={false}) so legacy jQuery always has
        // a node to draw into. If that regresses, the second visit renders into
        // a detached node and comes back empty.
        await bootGame(page, { save: loadSaveFixture(SAVE) });
        await runTicks(page, 50);

        const city = TABS[0];
        await page.locator('.tabs li').nth(city.index).click();
        await expect.poll(() => page.locator(`#${city.id}`).textContent())
            .toContain(city.contains);

        await page.locator('.tabs li').nth(TABS[2].index).click();
        await page.waitForTimeout(300);
        await page.locator('.tabs li').nth(city.index).click();

        await expect
            .poll(() => page.locator(`#${city.id}`).textContent(),
                { message: 'City tab was empty on the second visit' })
            .toContain(city.contains);
    });

    test('a tab selected by the engine is drawn, not just selected', async ({ page }) => {
        // Legacy code sets global.settings.civTabs directly — after a reset, or
        // from the governor. App.tsx polls for that, and the poll has to redraw
        // as well as re-select, or the tab comes up blank.
        await bootGame(page, { save: loadSaveFixture(SAVE) });
        await runTicks(page, 50);

        await page.evaluate(() => {
            (window as any).__evolveTest__.global.settings.civTabs = 2;
        });

        await expect
            .poll(() => page.locator('#mTabCivic').textContent(),
                { message: 'Civics tab selected programmatically but never drawn' })
            .toContain('Government');
    });
});
