import { test, expect, type Page } from '@playwright/test';
import { bootGame, runTicks, loadSaveFixture } from './harness';

/**
 * Espionage actions modal — Civics > Foreign powers.
 *
 * The trigger button is still legacy Vue markup; the modal it opens is React.
 * That split is the point of the leaf-by-leaf port, and it is what these
 * tests hold still: whichever side owns the DOM, clicking Espionage must
 * offer the right actions and starting one must reach the engine.
 *
 * The original opened a Buefy modal and polled every 50ms until #modalBox
 * existed before drawing buttons into it, so there was no way to assert on
 * the contents without also waiting out that poll. The React modal renders
 * its buttons with itself.
 */

const SAVE = 'orc-midgame-1.2.20';

interface SpySetup {
    gov?: number;
    spies?: number;
    hstl?: number;
    unrest?: number;
    money?: number;
}

/**
 * Open Civics with espionage available against `gov`.
 *
 * The save is mid-game but has no spies placed, so the preconditions are set
 * directly. A tick follows, because the loop is frozen and it is the loop
 * that would otherwise announce the change to the UI.
 */
async function openCivics(page: Page, setup: SpySetup = {}): Promise<void> {
    const { gov = 0, spies = 1, hstl = 100, unrest = 0, money = 0 } = setup;

    await bootGame(page, { save: loadSaveFixture(SAVE) });
    await runTicks(page, 50);

    await page.evaluate(args => {
        const g = (window as any).__evolveTest__.global;
        g.tech.spy = 2;
        const foreign = g.civic.foreign[`gov${args.gov}`];
        foreign.spy = args.spies;
        foreign.sab = 0;
        foreign.act = 'none';
        foreign.hstl = args.hstl;
        foreign.unrest = args.unrest;
        foreign.occ = false;
        foreign.anx = false;
        foreign.buy = false;
    }, { gov, spies, hstl, unrest });

    await runTicks(page, 1);

    // After the tick, not before: the loop clamps Money to its cap and adds
    // income, so a balance seeded ahead of it is not the one under test.
    if (money > 0) {
        await page.evaluate(amount => {
            const money = (window as any).__evolveTest__.global.resource.Money;
            money.max = Math.max(money.max, amount);
            money.amount = amount;
        }, money);
    }
    await page.locator('.tabs li').nth(2).click();
    await expect(page.locator('#foreign')).toBeVisible();
}

/** The Espionage button on a foreign power's row. */
function espionageButton(page: Page, gov = 0) {
    return page.locator(`#gov${gov} .sspy button`);
}

/** The modal's action buttons, scoped to the open dialog. */
function actionButtons(page: Page) {
    return page.locator('dialog[open] #espModal button[data-esp]');
}

function foreignState(page: Page, gov = 0) {
    return page.evaluate(g => {
        const f = (window as any).__evolveTest__.global.civic.foreign[`gov${g}`];
        return { sab: f.sab as number, act: f.act as string };
    }, gov);
}

async function openModal(page: Page, gov = 0): Promise<void> {
    await espionageButton(page, gov).click();
    await expect(page.locator('dialog[open] #espModal')).toBeVisible();
}

test.describe('espionage modal', () => {
    test('offers influence, sabotage and incite against an original power', async ({ page }) => {
        await openCivics(page);
        await openModal(page);

        await expect(actionButtons(page)).toHaveCount(3);
        expect(await actionButtons(page).evaluateAll(
            els => els.map(el => el.getAttribute('data-esp')),
        )).toEqual(['influence', 'sabotage', 'incite']);
        await expect(page.locator('dialog[open] #espModal button[data-esp="influence"]')).toHaveText('Influence');
    });

    test('starting an action reaches the engine and closes the modal', async ({ page }) => {
        await openCivics(page);
        await openModal(page);

        expect(await foreignState(page)).toEqual({ sab: 0, act: 'none' });

        await page.locator('dialog[open] #espModal button[data-esp="sabotage"]').click();

        await expect(page.locator('dialog[open]')).toHaveCount(0);
        const after = await foreignState(page);
        expect(after.act).toBe('sabotage');
        expect(after.sab).toBeGreaterThan(0);
    });

    test('dismissing with Escape starts nothing', async ({ page }) => {
        await openCivics(page);
        await openModal(page);

        await page.keyboard.press('Escape');

        await expect(page.locator('dialog[open]')).toHaveCount(0);
        expect(await foreignState(page)).toEqual({ sab: 0, act: 'none' });
    });

    test('annex is offered only once relations are calm and unrest is high', async ({ page }) => {
        // Hostile and content: the original conditions (hstl <= 50, unrest >= 50) both fail.
        await openCivics(page, { hstl: 100, unrest: 0 });
        await openModal(page);
        await expect(page.locator('dialog[open] #espModal button[data-esp="annex"]')).toHaveCount(0);
        await page.keyboard.press('Escape');

        await openCivics(page, { hstl: 20, unrest: 80 });
        await openModal(page);
        await expect(page.locator('dialog[open] #espModal button[data-esp="annex"]')).toHaveCount(1);
    });

    test('purchase is offered only with three spies, and is paid for', async ({ page }) => {
        await openCivics(page, { spies: 2 });
        await openModal(page);
        await expect(page.locator('dialog[open] #espModal button[data-esp="purchase"]')).toHaveCount(0);
        await page.keyboard.press('Escape');

        // Enough money that the price cannot be the reason it is refused.
        await openCivics(page, { spies: 3, money: 1e12 });
        await openModal(page);

        const before = await page.evaluate(
            () => (window as any).__evolveTest__.global.resource.Money.amount as number,
        );
        await page.locator('dialog[open] #espModal button[data-esp="purchase"]').click();

        await expect(page.locator('dialog[open]')).toHaveCount(0);
        const after = await foreignState(page);
        expect(after.act).toBe('purchase');
        expect(after.sab).toBeGreaterThan(0);

        const money = await page.evaluate(
            () => (window as any).__evolveTest__.global.resource.Money.amount as number,
        );
        expect(money).toBeLessThan(before);
    });

    test('an unaffordable purchase leaves the modal open and charges nothing', async ({ page }) => {
        await openCivics(page, { spies: 3, money: 1 });
        await openModal(page);

        const readMoney = () => page.evaluate(
            () => (window as any).__evolveTest__.global.resource.Money.amount as number,
        );
        const before = await readMoney();
        await page.locator('dialog[open] #espModal button[data-esp="purchase"]').click();

        // The engine refuses, so the click must not look like it worked.
        await expect(page.locator('dialog[open] #espModal')).toBeVisible();
        expect(await foreignState(page)).toEqual({ sab: 0, act: 'none' });
        expect(await readMoney()).toBe(before);
    });

    test('the modal does not leak React roots across repeated opens', async ({ page }) => {
        await openCivics(page);

        const islands = () => page.evaluate(
            () => (window as any).__evolveTest__.islandCount() as number,
        );

        await openModal(page);
        await page.keyboard.press('Escape');
        await expect(page.locator('dialog[open]')).toHaveCount(0);

        // Count after the first open: the host island exists from then on, so
        // this is the level it must stay at. Asserting no growth rather than
        // an absolute number keeps this about leaking, and stops it failing
        // every time some unrelated widget is ported into an island.
        const settled = await islands();

        for (let i = 0; i < 3; i++) {
            await openModal(page);
            await page.keyboard.press('Escape');
            await expect(page.locator('dialog[open]')).toHaveCount(0);
        }

        expect(await islands()).toBe(settled);
    });
});
