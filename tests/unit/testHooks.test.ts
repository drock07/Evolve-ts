import { describe, it, expect } from 'vitest';

/**
 * Unit tests for the harness's own pure helpers.
 *
 * Most of the game engine cannot be imported under Node: vars.ts reads
 * localStorage at module-eval time and locale.ts performs a synchronous
 * jQuery ajax call for its string table. Until those module-level side
 * effects are untangled (see the migration plan), engine coverage lives in
 * the Playwright suite and this file covers the pieces that are genuinely
 * pure.
 */

import { roundNumbers } from '../e2e/harness';

describe('roundNumbers', () => {
    it('rounds floats to the requested precision', () => {
        expect(roundNumbers(1.23456789, 3)).toBe(1.235);
    });

    it('leaves non-finite values alone', () => {
        expect(roundNumbers(Infinity)).toBe(Infinity);
        expect(Number.isNaN(roundNumbers(NaN) as number)).toBe(true);
    });

    it('recurses through arrays and nested objects', () => {
        const input = { a: [1.111111111, { b: 2.222222222 }], c: 'x', d: true };
        expect(roundNumbers(input, 4)).toEqual({
            a: [1.1111, { b: 2.2222 }],
            c: 'x',
            d: true,
        });
    });

    it('absorbs the float drift that makes raw snapshots flaky', () => {
        // 0.1 + 0.2 === 0.30000000000000004
        expect(roundNumbers(0.1 + 0.2, 6)).toBe(0.3);
    });
});
