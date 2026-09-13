import { test, expect, type Page } from '@playwright/test';
import { bootGame, runTicks, loadSaveFixture } from './harness';

/**
 * Behavioural baseline for the job list — Civics > Government.
 *
 * Written against the legacy Vue implementation before porting. This one is a
 * step up from the earlier leaves: it is a repeating list, the rows come in
 * two visual variants, and the controls move workers between jobs rather than
 * editing one number.
 *
 * The two variants:
 *
 *  - jobs loaded without a colour (plus unemployed) render the name as a link
 *    that sets the default job, marked with `*` while it is the default, and a
 *    plain worker count. The default job's own controls are hidden.
 *  - jobs loaded with a colour render a coloured heading and a "workers / max"
 *    count whose class reflects how full the job is.
 */

const SAVE = 'orc-midgame-1.2.20';

async function openCivics(page: Page) {
    await bootGame(page, { save: loadSaveFixture(SAVE) });
    await runTicks(page, 50);
    await page.locator('.tabs li').nth(2).click();
    await expect(page.locator('#jobs')).toBeVisible();
}

function workers(page: Page, job: string) {
    return page.evaluate(
        j => (window as any).__evolveTest__.global.civic[j].workers as number,
        job,
    );
}

function defaultJob(page: Page) {
    return page.evaluate(() => (window as any).__evolveTest__.global.civic.d_job as string);
}

test.describe('job list', () => {
    test('renders every visible job, in engine order', async ({ page }) => {
        await openCivics(page);

        const ids = await page.locator('#jobs > div').evaluateAll(
            els => els.map(e => e.id),
        );
        expect(ids.length).toBeGreaterThan(20);
        // Order comes from the sequence of loadJob calls in defineJobs.
        expect(ids.slice(0, 6)).toEqual([
            'civ-unemployed', 'civ-hunter', 'civ-forager',
            'civ-farmer', 'civ-lumberjack', 'civ-quarry_worker',
        ]);
        for (const id of ids) {
            await expect(page.locator(`#${id}`)).toHaveClass(/job/);
        }
    });

    test('the default-job variant renders a settable link and a plain count', async ({ page }) => {
        await openCivics(page);
        const row = page.locator('#civ-lumberjack');

        await expect(row.locator('.job_label h3 a')).toHaveText('Lumberjack');
        await expect(row.locator('.job_label .count'))
            .toHaveText(String(await workers(page, 'lumberjack')));
        await expect(row.locator('.controls .sub'))
            .toHaveAttribute('aria-label', 'Remove Lumberjack');
        await expect(row.locator('.controls .add'))
            .toHaveAttribute('aria-label', 'Add Lumberjack');
    });

    test('the current default job is starred and has no controls', async ({ page }) => {
        await openCivics(page);
        expect(await defaultJob(page)).toBe('farmer');

        await expect(page.locator('#civ-farmer .job_label h3 a')).toHaveText('Farmer*');
        await expect(page.locator('#civ-farmer .controls')).toBeHidden();
        // A non-default job keeps its controls.
        await expect(page.locator('#civ-lumberjack .controls')).toBeVisible();
    });

    test('the coloured variant renders workers over max with a fill class', async ({ page }) => {
        await openCivics(page);
        const row = page.locator('#civ-professor');

        await expect(row.locator('.job_label h3')).toHaveText('Professor');
        const w = await workers(page, 'professor');
        const max = await page.evaluate(
            () => (window as any).__evolveTest__.global.civic.professor.max as number,
        );
        await expect(row.locator('.job_label .count')).toHaveText(`${w} / ${max}`);
        // Full, so the count is styled as success.
        expect(w).toBe(max);
        await expect(row.locator('.job_label .count')).toHaveClass(/has-text-success/);
    });

    test('the arrows move workers to and from the default job', async ({ page }) => {
        await openCivics(page);
        const row = page.locator('#civ-lumberjack');

        const lumber0 = await workers(page, 'lumberjack');
        const farmer0 = await workers(page, 'farmer');

        await row.locator('.controls .add').click();
        expect(await workers(page, 'lumberjack')).toBe(lumber0 + 1);
        expect(await workers(page, 'farmer'), 'worker should come from the default job')
            .toBe(farmer0 - 1);
        await expect(row.locator('.job_label .count')).toHaveText(String(lumber0 + 1));

        await row.locator('.controls .sub').click();
        expect(await workers(page, 'lumberjack')).toBe(lumber0);
        expect(await workers(page, 'farmer')).toBe(farmer0);
    });

    test('clicking a job name makes it the default', async ({ page }) => {
        await openCivics(page);

        await page.locator('#civ-lumberjack .job_label h3 a').click();
        await expect
            .poll(() => defaultJob(page))
            .toBe('lumberjack');

        // The star and the hidden controls follow the default.
        await expect(page.locator('#civ-lumberjack .job_label h3 a')).toHaveText('Lumberjack*');
        await expect(page.locator('#civ-lumberjack .controls')).toBeHidden();
        await expect(page.locator('#civ-farmer .job_label h3 a')).toHaveText('Farmer');
        await expect(page.locator('#civ-farmer .controls')).toBeVisible();
    });
});
