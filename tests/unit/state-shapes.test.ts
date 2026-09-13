import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import LZString from 'lz-string';

/**
 * Keeps src/types/state.ts honest.
 *
 * Those types were derived by profiling the save fixtures, which makes them
 * accurate today and quietly wrong the moment the shape drifts. TypeScript
 * cannot check a declared type against runtime data, so these tests do it:
 * they read the fixtures and assert the same invariants the types claim.
 *
 * A failure here means the type and the data disagree — fix whichever is
 * wrong, rather than relaxing the test.
 */

const FIXTURES = ['orc-midgame-1.2.20', 'prestige-evolution-1.3.9'];

function loadSave(name: string): Record<string, any> {
    const file = resolve(process.cwd(), 'tests/fixtures/saves', `${name}.txt`);
    const json = LZString.decompressFromBase64(readFileSync(file, 'utf8').trim());
    return JSON.parse(json!);
}

/** Mirrors CityFixed in src/types/state.ts — keys of global.city that are not structures. */
const CITY_FIXED = new Set([
    'calendar', 'morale', 'market', 'geology', 'ptrait', 'biome', 'powered',
    'power', 'power_total', 'sun', 'cold', 'hot',
    'firestorm', 'slaughter', 'tormented', 'surfaceDwellers',
]);

/** Mirrors CivicFixed — keys of global.civic that are not jobs. */
const CIVIC_FIXED = new Set([
    'govern', 'taxes', 'garrison', 'foreign', 'mad', 'homeless', 'd_job', 'new', 'free',
]);

describe.each(FIXTURES)('%s', name => {
    const save = loadSave(name);

    it('every non-fixed city key is a structure with a numeric count', () => {
        const offenders: string[] = [];
        for (const [key, value] of Object.entries(save.city ?? {})) {
            if (CITY_FIXED.has(key)) continue;
            if (typeof value !== 'object' || value === null || Array.isArray(value)) {
                offenders.push(`${key}: ${Array.isArray(value) ? 'array' : typeof value}`);
                continue;
            }
            if (typeof (value as any).count !== 'number') {
                offenders.push(`${key}: count is ${typeof (value as any).count}`);
            }
        }
        // A new offender means global.city grew a key that is not a structure
        // and is not declared in CityFixed.
        expect(offenders).toEqual([]);
    });

    it('city structure extras are all primitives', () => {
        // CityStructure's index signature is `number | string | boolean |
        // undefined`; an object or array here would silently not typecheck.
        const offenders: string[] = [];
        for (const [key, value] of Object.entries(save.city ?? {})) {
            if (CITY_FIXED.has(key) || typeof value !== 'object' || value === null) continue;
            for (const [ek, ev] of Object.entries(value as object)) {
                if (ev !== null && (typeof ev === 'object' || Array.isArray(ev))) {
                    offenders.push(`${key}.${ek}`);
                }
            }
        }
        expect(offenders).toEqual([]);
    });

    it('every non-fixed civic key is a job with the required fields', () => {
        const offenders: string[] = [];
        for (const [key, value] of Object.entries(save.civic ?? {})) {
            if (CIVIC_FIXED.has(key)) continue;
            if (typeof value !== 'object' || value === null) {
                offenders.push(`${key}: ${typeof value}`);
                continue;
            }
            const job = value as any;
            // The five fields loadJob() always creates.
            if (typeof job.job !== 'string') offenders.push(`${key}.job`);
            if (typeof job.display !== 'boolean') offenders.push(`${key}.display`);
            if (typeof job.workers !== 'number') offenders.push(`${key}.workers`);
            if (typeof job.max !== 'number') offenders.push(`${key}.max`);
        }
        expect(offenders).toEqual([]);
    });

    it('city.calendar matches CityCalendar', () => {
        const cal = save.city?.calendar;
        expect(cal, 'no calendar in fixture').toBeTruthy();
        for (const field of ['day', 'year', 'weather', 'temp', 'moon', 'wind', 'orbit']) {
            expect(typeof cal[field], `calendar.${field}`).toBe('number');
        }
    });

    it('civic.govern matches CivicGovernment', () => {
        expect(typeof save.civic.govern.type).toBe('string');
        expect(typeof save.civic.govern.rev).toBe('number');
        expect(typeof save.civic.govern.fr).toBe('number');
    });

    it('the optional civic keys are either absent or correctly shaped', () => {
        // taxes, garrison and mad do not exist during the evolution phase,
        // which is why CivicFixed marks them optional. When they are present
        // they must still match.
        if (save.civic.taxes) {
            expect(typeof save.civic.taxes.tax_rate).toBe('number');
            expect(typeof save.civic.taxes.display).toBe('boolean');
        }
        if (save.civic.garrison) {
            for (const f of ['display', 'disabled']) {
                expect(typeof save.civic.garrison[f], `garrison.${f}`).toBe('boolean');
            }
            for (const f of ['rate', 'progress', 'tactic', 'workers', 'wounded', 'raid']) {
                expect(typeof save.civic.garrison[f], `garrison.${f}`).toBe('number');
            }
        }
        if (save.civic.mad) {
            expect(typeof save.civic.mad.display).toBe('boolean');
            expect(typeof save.civic.mad.armed).toBe('boolean');
        }
    });
});
