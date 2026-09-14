import { test, expect, type Page } from '@playwright/test';
import { bootGame, runTicks, loadSaveFixture } from './harness';

/**
 * Behavioural baseline for the garrison — Civics > Government (compact) and
 * Civics > Military (full).
 *
 * Written against the legacy Vue implementation before porting it, the same
 * way the government selector was. It matters more here than it did there:
 * the garrison is the largest widget ported so far — two render targets, a
 * dozen derived values and eight handlers — and the top bar has just shown
 * what an untested port looks like when it goes wrong. It rendered perfectly
 * and every control was inert, for as long as nobody clicked one.
 *
 * So these assert on what the controls *do*, not only on what is drawn.
 *
 * The same builder produces both targets, differing by its `full` flag: the
 * compact one omits the training progress and the campaign launch buttons.
 * Both are covered, because the flag is exactly the kind of thing a port
 * collapses by accident.
 */

const SAVE = 'orc-midgame-1.2.20';

/** Civics sub-tab indices, as rendered for this save. */
const GOVERNMENT_TAB = 0;
const MILITARY_TAB = 3;

async function openCivics(page: Page, subTab: number): Promise<void> {
    await bootGame(page, { save: loadSaveFixture(SAVE) });
    await runTicks(page, 50);
    await page.locator('.tabs li').nth(2).click();
    await page.locator('#mTabCivic .tabs li').nth(subTab).click();
}

/** The compact garrison, which lives under the Government sub-tab. */
async function openCompact(page: Page): Promise<void> {
    await openCivics(page, GOVERNMENT_TAB);
    await expect(page.locator('#c_garrison')).toBeVisible();
}

/** The full garrison, which lives under the Military sub-tab. */
async function openFull(page: Page): Promise<void> {
    await openCivics(page, MILITARY_TAB);
    await expect(page.locator('#garrison')).toBeVisible();
}

function garrison(page: Page) {
    return page.evaluate(() => {
        const g = (window as any).__evolveTest__.global.civic.garrison;
        return {
            tactic: g.tactic as number,
            raid: g.raid as number,
            workers: g.workers as number,
            max: g.max as number,
            wounded: g.wounded as number,
        };
    });
}

test.describe('garrison — what it shows', () => {
    test('the header carries defensive, offensive and per-soldier ratings', async ({ page }) => {
        await openCompact(page);

        const header = page.locator('#c_garrison .header');
        await expect(header).toContainText('Garrison');
        await expect(header.locator('.defenseRating')).toContainText('Rating');
        // Offensive rating is shown only while the world is not yet controlled.
        await expect(header.locator('.offenseRating')).toBeVisible();
        await expect(header.locator('.soldierRating')).toContainText('Soldier Rating');
    });

    test('the barracks count stationed soldiers against the cap', async ({ page }) => {
        await openCompact(page);
        const state = await garrison(page);

        const barracks = page.locator('#c_garrison .barracks').first();
        await expect(barracks.locator('.soldier')).toHaveText('Soldiers');
        await expect(barracks).toContainText(String(state.workers));
    });

    test('the crew line is hidden while there is no ship crew', async ({ page }) => {
        await openCompact(page);

        expect((await garrison(page)).workers).toBeGreaterThan(0);
        await expect(page.locator('#c_garrison .crew')).toBeHidden();
    });

    test('wounded are reported', async ({ page }) => {
        await openCompact(page);
        await expect(page.locator('#c_garrison .wounded')).toHaveText('Wounded');
    });

    test('the full garrison adds training progress; the compact one does not', async ({ page }) => {
        await openFull(page);
        await expect(page.locator('#garrison .training')).toContainText('Training');
        await expect(page.locator('#garrison .training progress')).toHaveCount(1);

        await openCompact(page);
        await expect(page.locator('#c_garrison .training')).toHaveCount(0);
    });

    test('the full garrison adds a campaign button per foreign power', async ({ page }) => {
        await openFull(page);

        for (const gov of [0, 1, 2]) {
            await expect(page.locator(`#garrison .launch.gov${gov} button`)).toHaveCount(1);
        }

        await openCompact(page);
        await expect(page.locator('#c_garrison .launch')).toHaveCount(0);
    });
});

test.describe('garrison — what its controls do', () => {
    test('the campaign arrows walk through the tactics, and stop at both ends', async ({ page }) => {
        await openCompact(page);

        const harder = page.locator('#c_tactics .add');
        const easier = page.locator('#c_tactics .sub');

        // Siege is the hardest tactic, and this save is already on it.
        expect((await garrison(page)).tactic).toBe(4);
        await harder.click();
        expect((await garrison(page)).tactic).toBe(4);

        await easier.click();
        expect((await garrison(page)).tactic).toBe(3);
        await expect(page.locator('#c_tactics .current.tactic')).toHaveText('Assault');

        for (let i = 0; i < 5; i++) await easier.click();
        expect((await garrison(page)).tactic).toBe(0);
        await expect(page.locator('#c_tactics .current.tactic')).toHaveText('Ambush');
    });

    test('the battalion arrows resize the raiding party within its bounds', async ({ page }) => {
        await openCompact(page);

        const more = page.locator('#c_battalion .add');
        const fewer = page.locator('#c_battalion .sub');
        const before = await garrison(page);

        await fewer.click();
        expect((await garrison(page)).raid).toBe(before.raid - 1);

        await more.click();
        expect((await garrison(page)).raid).toBe(before.raid);

        // The party cannot outgrow the garrison, nor shrink below nothing.
        for (let i = 0; i < before.workers + 4; i++) await more.click();
        const full = (await garrison(page)).raid;
        expect(full).toBeLessThanOrEqual(before.workers);

        for (let i = 0; i < full + 4; i++) await fewer.click();
        expect((await garrison(page)).raid).toBe(0);
    });

    test('hiring a mercenary costs money and adds a soldier', async ({ page }) => {
        await openCompact(page);

        await page.evaluate(() => {
            const g = (window as any).__evolveTest__.global;
            // Afford the merc outright, and leave room for them to be housed.
            g.resource.Money.max = Math.max(g.resource.Money.max, 1e9);
            g.resource.Money.amount = 1e9;
            g.civic.garrison.max += 1;
        });

        const before = await garrison(page);
        const money = () => page.evaluate(
            () => (window as any).__evolveTest__.global.resource.Money.amount as number,
        );
        const moneyBefore = await money();

        await page.locator('#c_garrison .hmerc').click();

        expect((await garrison(page)).workers).toBe(before.workers + 1);
        expect(await money()).toBeLessThan(moneyBefore);
    });

    test('the tactic description popover reflects the selected tactic', async ({ page }) => {
        await openCompact(page);

        // Popovers all render into a single #popper element, tagged with the
        // id they were registered under.
        await page.locator('#c_tactics .current.tactic').hover();
        const popper = page.locator('#popper[data-id="cGarrisontactic"]');
        await expect(popper).toBeVisible();
        await expect(popper).toContainText('siege', { ignoreCase: true });
    });
});
