#!/usr/bin/env node
/**
 * Typecheck ratchet.
 *
 * `tsc --noEmit` currently reports tens of thousands of errors: the original
 * migration renamed every .js to .ts without typing anything, and the build
 * (esbuild via Vite) strips types without checking them. Gating CI on zero
 * errors would mean gating on nothing, since it can never pass.
 *
 * So instead we gate on the count never increasing. New code must not add
 * errors, and every cleanup lowers the baseline permanently. Update the
 * baseline by running:  node scripts/typecheck-ratchet.mjs --write
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const BASELINE_FILE = new URL('./typecheck-baseline.json', import.meta.url);

function countErrors() {
    let output = '';
    try {
        output = execSync('npx tsc --noEmit', {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
            // tsc emits tens of MB here; the 1MB default silently truncates
            // the stream and the ratchet would then undercount badly.
            maxBuffer: 512 * 1024 * 1024,
        });
    } catch (err) {
        // tsc exits non-zero when it reports errors — that is the normal path.
        output = `${err.stdout ?? ''}${err.stderr ?? ''}`;
    }
    return (output.match(/error TS\d+/g) ?? []).length;
}

const actual = countErrors();
const write = process.argv.includes('--write');

if (write || !existsSync(BASELINE_FILE)) {
    writeFileSync(BASELINE_FILE, `${JSON.stringify({ maxErrors: actual }, null, 2)}\n`);
    console.log(`Typecheck baseline written: ${actual} errors.`);
    process.exit(0);
}

const { maxErrors } = JSON.parse(readFileSync(BASELINE_FILE, 'utf8'));

if (actual > maxErrors) {
    console.error(
        `Typecheck regression: ${actual} errors, baseline is ${maxErrors} (+${actual - maxErrors}).\n` +
        `Fix the new errors, or if this increase is genuinely intended run:\n` +
        `  node scripts/typecheck-ratchet.mjs --write`,
    );
    process.exit(1);
}

if (actual < maxErrors) {
    console.log(
        `Typecheck improved: ${actual} errors, baseline was ${maxErrors} (-${maxErrors - actual}).\n` +
        `Lower the baseline with: node scripts/typecheck-ratchet.mjs --write`,
    );
} else {
    console.log(`Typecheck steady at ${actual} errors.`);
}
