import { test, expect, type Page } from '@playwright/test';
import { bootGame, runTicks, loadSaveFixture } from './harness';

/**
 * Behavioural baseline for the structure button — actions.ts setAction().
 *
 * Written against the legacy Vue implementation before porting it, as the
 * garrison's was. This one matters more than any so far: setAction is a single
 * renderer instantiated once per structure in every region of the game — 42 in
 * the city alone in this save, and the same function draws space, portal,
 * truepath and edenic. It is the largest single lever in the port and the
 * largest single thing that can break.
 *
 * These assert behaviour, not markup, because the markup is what the port
 * changes. What must survive: each structure renders with its name and count,
 * advertises its costs, says whether it can be afforded, builds when clicked,
 * powers on and off, and describes itself on hover.
 */

const SAVE = 'orc-midgame-1.2.20';

async function openCity(page: Page): Promise<void> {
    await bootGame(page, { save: loadSaveFixture(SAVE) });
    await runTicks(page, 50);
    await page.locator('.tabs').first().locator('li').nth(1).click();
    await expect(page.locator('#city .action').first()).toBeVisible();
}

/** Engine-side state for a city structure. */
function structure(page: Page, key: string) {
    return page.evaluate(k => {
        const c = (window as any).__evolveTest__.global.city[k];
        return { count: c?.count as number, on: c?.on as number | undefined };
    }, key);
}

const money = (page: Page) => page.evaluate(
    () => (window as any).__evolveTest__.global.resource.Money.amount as number,
);

test.describe('structure buttons — what they show', () => {
    test('every unlocked structure renders with a title', async ({ page }) => {
        await openCity(page);

        const actions = page.locator('#city .action');
        expect(await actions.count()).toBeGreaterThan(20);

        // Every one carries a non-empty name.
        const titles = await page.locator('#city .action .aTitle').allTextContents();
        expect(titles.length).toBeGreaterThan(20);
        expect(titles.every(t => t.trim().length > 0)).toBe(true);
    });

    test('a built structure shows its count, matching the engine', async ({ page }) => {
        await openCity(page);

        const state = await structure(page, 'basic_housing');
        expect(state.count).toBeGreaterThan(0);
        await expect(page.locator('#city-basic_housing .count').first())
            .toHaveText(String(state.count));
    });

    test('costs are advertised as data attributes and res- classes', async ({ page }) => {
        await openCity(page);

        const button = page.locator('#city-basic_housing a.button');
        // The engine prices huts in money and lumber.
        await expect(button).toHaveAttribute('data-money', /^\d+$/);
        await expect(button).toHaveAttribute('data-lumber', /^\d+$/);
        await expect(button).toHaveClass(/res-Money/);
        await expect(button).toHaveClass(/res-Lumber/);
    });

    test('an unaffordable structure is marked as such', async ({ page }) => {
        await openCity(page);

        // The affordability class is refreshed on a slower loop than the tick,
        // and the treasury refills as the game runs — so the money is zeroed
        // again before each tick rather than once at the start. Polling rather
        // than asserting after a fixed count keeps this off the exact cadence,
        // which is engine detail the port is free to change.
        await expect.poll(async () => {
            await page.evaluate(() => {
                (window as any).__evolveTest__.global.resource.Money.amount = 0;
            });
            await runTicks(page, 1);
            return page.evaluate(
                () => document.querySelector('#city-basic_housing')?.className ?? '',
            );
        }, { timeout: 15000 }).toContain('cna');
    });

    test('a powered structure offers on and off controls', async ({ page }) => {
        await openCity(page);

        const factory = page.locator('#city-factory');
        await expect(factory.locator('.on')).toHaveCount(1);
        await expect(factory.locator('.off')).toHaveCount(1);
    });

    test('a structure with options offers them', async ({ page }) => {
        await openCity(page);
        await expect(page.locator('#city-smelter .special')).toHaveCount(1);
    });
});

test.describe('structure buttons — what they do', () => {
    test('clicking one builds it and spends the cost', async ({ page }) => {
        await openCity(page);

        await page.evaluate(() => {
            const g = (window as any).__evolveTest__.global;
            for (const res of Object.keys(g.resource)) {
                if (g.resource[res] && typeof g.resource[res].amount === 'number') {
                    g.resource[res].max = Math.max(g.resource[res].max, 1e12);
                    g.resource[res].amount = 1e12;
                }
            }
        });
        await runTicks(page, 1);

        const before = await structure(page, 'basic_housing');
        const cashBefore = await money(page);

        await page.locator('#city-basic_housing a.button').click();

        const after = await structure(page, 'basic_housing');
        expect(after.count).toBe(before.count + 1);
        expect(await money(page)).toBeLessThan(cashBefore);
    });

    test('a structure that cannot be afforded does not build', async ({ page }) => {
        await openCity(page);

        await page.evaluate(() => {
            const g = (window as any).__evolveTest__.global;
            for (const res of Object.keys(g.resource)) {
                if (g.resource[res] && typeof g.resource[res].amount === 'number') {
                    g.resource[res].amount = 0;
                }
            }
        });
        await runTicks(page, 1);

        const before = await structure(page, 'basic_housing');
        await page.locator('#city-basic_housing a.button').click();
        expect((await structure(page, 'basic_housing')).count).toBe(before.count);
    });

    test('the power controls turn a structure off and on again', async ({ page }) => {
        await openCity(page);

        const before = await structure(page, 'factory');
        expect(before.on).toBeGreaterThan(0);

        await page.locator('#city-factory .off').click();
        expect((await structure(page, 'factory')).on).toBe(before.on! - 1);

        await page.locator('#city-factory .on').click();
        expect((await structure(page, 'factory')).on).toBe(before.on);
    });

    test('hovering a structure describes its cost and effect', async ({ page }) => {
        await openCity(page);

        await page.locator('#city-basic_housing a.button').hover();
        const popper = page.locator('.popper');
        await expect(popper).toHaveCount(1);

        // What the description is for: what the thing does, and what it costs.
        // Money renders as a figure rather than a named resource, which is why
        // this looks for the amount rather than the word.
        await expect(popper).toContainText('citizen');
        await expect(popper).toContainText(/\$[\d,]+/);
        await expect(popper).toContainText(/Lumber/);
    });

    test('the options control opens a modal', async ({ page }) => {
        await openCity(page);

        await page.locator('#city-smelter .special').click();
        await expect(page.locator('#modalBox, dialog[open]').first()).toBeVisible();
    });
});

/**
 * The same renderer draws the tech tree.
 *
 * setAction is called with action 'tech' for available research and with the
 * `old` flag for everything already researched, which renders a plain label
 * with no costs, count or controls. That is a large surface — 189 old entries
 * in this save — reached through the same function, so it is covered here
 * rather than left to the assumption that city coverage implies it.
 */
test.describe('the tech tree uses the same renderer', () => {
    async function openResearch(page: Page): Promise<void> {
        await bootGame(page, { save: loadSaveFixture(SAVE) });
        await runTicks(page, 50);
        await page.locator('.tabs').first().locator('li').nth(3).click();
        await expect(page.locator('#tech .action').first()).toBeVisible();
    }

    test('available techs render as buttons with names and costs', async ({ page }) => {
        await openResearch(page);

        const cards = page.locator('#tech .action');
        expect(await cards.count()).toBeGreaterThan(0);

        const first = cards.first();
        await expect(first.locator('.aTitle')).not.toBeEmpty();
        // Research costs knowledge, so the cost machinery must have run.
        await expect(first.locator('a.button')).toHaveClass(/res-Knowledge/);
    });

    test('researched techs render as plain labels', async ({ page }) => {
        await openResearch(page);

        const old = page.locator('#oldTech .action');
        expect(await old.count()).toBeGreaterThan(0);

        const first = old.first();
        await expect(first.locator('.oldTech .aTitle')).not.toBeEmpty();
        // No controls on something already owned.
        await expect(first.locator('.count')).toHaveCount(0);
        await expect(first.locator('.on')).toHaveCount(0);
    });

    test('a tech describes itself on hover', async ({ page }) => {
        await openResearch(page);

        await page.locator('#tech .action a.button').first().hover();
        await expect(page.locator('.popper')).toHaveCount(1);
        await expect(page.locator('.popper')).not.toBeEmpty();
    });
});
