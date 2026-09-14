import { test, expect, type Page } from '@playwright/test';
import { bootGame, runTicks, loadSaveFixture } from './harness';

/**
 * Every legacy popover must be able to fire.
 *
 * popover() binds jQuery handlers to whatever its selector matches when it is
 * called. That held while the DOM was built synchronously by jQuery on the
 * line above; it does not hold against React, which renders asynchronously.
 * The selector matches nothing, `.on()` binds an empty set, and the
 * description silently never appears.
 *
 * Three had died that way before this existed — the government label, the
 * change-government button and the tax rates heading — and nothing caught
 * them, because the markup all still rendered. This sweeps for the rest.
 *
 * Reading the audit once would be worse than useless. Legacy tears down a
 * tab's DOM when you switch away, so most popovers point at detached elements
 * at any given moment: a single reading reports 282 dead, all of them healthy.
 * So every panel state is sampled and only what is dead in all of them counts
 * — a popover whose element is live while its own panel is up drops out.
 */

const SAVE = 'orc-midgame-1.2.20';

const TABS = [
    { index: 1, panel: '#mTabCivil', subTabs: 8 },
    { index: 2, panel: '#mTabCivic', subTabs: 10 },
    { index: 3, panel: '#mTabResearch', subTabs: 4 },
    { index: 4, panel: '#mTabResource', subTabs: 4 },
];

interface Dead { id: string; selector: string; reason: string }

const readDead = (page: Page) =>
    page.evaluate(() => (window as any).__evolveTest__.deadPopovers() as Dead[]);

/**
 * Open every panel, sampling the audit at each, and keep what stays dead.
 *
 * Returns the survivors keyed by id, along with how many registrations were
 * seen in total — a sweep that visited nothing would otherwise report a clean
 * bill of health.
 */
async function sweep(page: Page): Promise<{ dead: Dead[]; total: number }> {
    let surviving: Map<string, Dead> | null = null;

    const sample = async () => {
        const dead = await readDead(page);
        const seen = new Map(dead.map(d => [d.id, d]));
        if (surviving === null) {
            surviving = seen;
            return;
        }
        for (const id of [...surviving.keys()]) {
            if (!seen.has(id)) surviving.delete(id);
        }
    };

    for (const tab of TABS) {
        await page.locator('.tabs').first().locator('li').nth(tab.index).click();
        await sample();

        for (let sub = 0; sub < tab.subTabs; sub++) {
            const t = page.locator(`${tab.panel} .tabs li`).nth(sub);
            if (await t.count() === 0) break;
            if (!await t.isVisible()) continue;
            await t.click();
            await sample();
        }
    }

    const total = await page.evaluate(
        () => (window as any).__evolveTest__.popoverBindingCount() as number,
    );
    return { dead: [...(surviving ?? new Map<string, Dead>()).values()], total };
}

test('no legacy popover is bound to nothing', async ({ page }) => {
    await bootGame(page, { save: loadSaveFixture(SAVE) });
    await runTicks(page, 50);

    const { dead, total } = await sweep(page);

    // A sweep that saw no registrations would pass vacuously.
    expect(total).toBeGreaterThan(100);

    const report = dead
        .map(d => `  ${d.id}  (${d.selector}) — ${d.reason}`)
        .join('\n');

    expect(dead, dead.length ? `\n${report}\n` : undefined).toEqual([]);
});
