import { test, expect, type Page } from '@playwright/test';
import { bootGame, runTicks, loadSaveFixture } from './harness';

/**
 * Everything React renders must still be React's when the page settles.
 *
 * When vBind mounts on an element React already owns, Vue wins silently. It
 * uses the element's existing DOM as its template and re-renders over it, so
 * React's nodes are replaced by Vue's copies and React's delegated events then
 * match nothing. The markup still looks right — it was copied from what React
 * produced — and the only symptom is that every control inside is inert.
 *
 * That shipped. The whole top bar, pause button included, did nothing at all,
 * and no test noticed because everything still rendered.
 *
 * The check is deliberately not "does this element carry the `vb` class React
 * also owns": Vue replaces the node, so the class lands on a fresh element
 * with no React fiber on it and the conflict leaves no single element
 * carrying both marks. What it does leave is a React-rendered element that is
 * no longer React's, which is what is asserted here.
 *
 * Every widget ported so far is listed. During a strangler-fig port each one
 * passes through the state where a legacy container holds React contents, so
 * this is a standing hazard rather than a one-off, and the list is the price
 * of catching it.
 *
 * Worth being straight about what has and has not been demonstrated: the
 * detector is verified below against a node replaced by a copy of itself,
 * which is the signature the original bug left (its pause button carried no
 * React fiber). Re-adding the offending vBind does not reproduce that bug on
 * its own — the binding that caused it had a full data/methods/filters set —
 * so this guard has not been run end-to-end against the original defect.
 */

const SAVE = 'orc-midgame-1.2.20';

interface Owned {
    /** A selector React is responsible for rendering. */
    selector: string;
    /** Outer tab to open first, if any. */
    tab?: number;
    /** Sub-tab within that tab's panel. */
    subTab?: number;
    panel?: string;
}

const REACT_OWNED: Owned[] = [
    { selector: '#topBar .planet' },
    { selector: '#topBar #pausegame' },
    { selector: '#c_garrison .hmerc', tab: 2, panel: '#mTabCivic', subTab: 0 },
    { selector: '#c_tactics .add', tab: 2, panel: '#mTabCivic', subTab: 0 },
    { selector: '#govType .change button', tab: 2, panel: '#mTabCivic', subTab: 0 },
    { selector: '#garrison .hmerc', tab: 2, panel: '#mTabCivic', subTab: 3 },
    { selector: '#tactics .add', tab: 2, panel: '#mTabCivic', subTab: 3 },
    { selector: '#tax_rates .add', tab: 2, panel: '#mTabCivic', subTab: 0 },
];

/** Is this element one React rendered, rather than a copy Vue made of it? */
async function isReactOwned(page: Page, selector: string): Promise<boolean | 'missing'> {
    return page.evaluate(sel => {
        const el = document.querySelector(sel);
        if (!el) return 'missing' as const;
        return Object.keys(el).some(k => k.startsWith('__reactFiber'));
    }, selector);
}

test('elements React renders are still owned by React', async ({ page }) => {
    await bootGame(page, { save: loadSaveFixture(SAVE) });
    await runTicks(page, 50);

    const stolen: string[] = [];
    const missing: string[] = [];

    for (const target of REACT_OWNED) {
        if (target.tab !== undefined) {
            await page.locator('.tabs').first().locator('li').nth(target.tab).click();
        }
        if (target.subTab !== undefined && target.panel) {
            await page.locator(`${target.panel} .tabs li`).nth(target.subTab).click();
        }

        const owned = await isReactOwned(page, target.selector);
        if (owned === 'missing') missing.push(target.selector);
        else if (!owned) stolen.push(target.selector);
    }

    // A selector that matches nothing would make this pass vacuously, so an
    // absent element is a failure in its own right rather than a skip.
    expect({ stolen, missing }).toEqual({ stolen: [], missing: [] });
});

test('the ownership check can actually tell when a node has been taken', async ({ page }) => {
    // Guards against the check above passing because React fibers stopped
    // being detectable at all — in which case nothing would ever read as
    // stolen and the whole file would be decoration.
    await bootGame(page, { save: loadSaveFixture(SAVE) });
    await runTicks(page, 50);

    expect(await isReactOwned(page, '#topBar .planet')).toBe(true);

    // Exactly what Vue does when it mounts over React: the element is replaced
    // by a copy built from its markup, carrying none of React's bookkeeping.
    await page.evaluate(() => {
        const el = document.querySelector('#topBar .planet')!;
        el.replaceWith(el.cloneNode(true));
    });

    expect(await isReactOwned(page, '#topBar .planet')).toBe(false);
});
