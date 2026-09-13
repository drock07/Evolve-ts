#!/usr/bin/env node
/**
 * Validate any Evolve save against the types in src/types/state.ts.
 *
 * The committed fixtures in tests/fixtures/saves cover the early and mid
 * game. The region subtrees — portal, interstellar, tauceti, eden, galaxy,
 * starDock — are empty in both, so their types were derived from the struct()
 * declarations in the actions tree instead (see tests/e2e/struct-defaults.spec.ts).
 *
 * This script closes that loop for anyone who has a save those types have
 * never seen. Point it at a save file and it reports whether the state
 * actually matches what we claim. It deliberately takes a path rather than
 * shipping more fixtures: late-game saves belong to the players who made
 * them, and this way you can check one without anybody redistributing it.
 *
 * Usage:
 *   node scripts/validate-external-save.mjs <file-or-directory>...
 *
 * Accepts the LZString base64 form the game's export button produces, or
 * already-decoded JSON.
 */

import LZString from 'lz-string';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';

/** Keys of each region that are NOT structures — mirrors src/types/state.ts. */
const SPECIALS = {
    city: new Set([
        'calendar', 'morale', 'market', 'geology', 'ptrait', 'biome', 'powered',
        'power', 'power_total', 'sun', 'cold', 'hot',
        'firestorm', 'slaughter', 'tormented', 'surfaceDwellers',
    ]),
    space: new Set(['syndicate', 'position']),
    portal: new Set(['fortress', 'observe', 'throne']),
    interstellar: new Set(),
    tauceti: new Set(),
    eden: new Set(['fortress', 'enemy_isle', 'palace', 'apotheosis']),
    galaxy: new Set(['defense', 'trade', 'alien1', 'alien2']),
    starDock: new Set(),
};

/** StructureField = number | string | boolean | unknown[] | Record<string, unknown> | undefined */
function isStructureField(v) {
    if (v === null || v === undefined) return true;
    const t = typeof v;
    return t === 'number' || t === 'string' || t === 'boolean' || t === 'object';
}

function decode(text) {
    const trimmed = text.trim();
    if (trimmed.startsWith('{')) return JSON.parse(trimmed);
    const json = LZString.decompressFromBase64(trimmed);
    if (!json || !json.trimStart().startsWith('{')) {
        throw new Error('not a valid save (expected LZString base64 or JSON)');
    }
    return JSON.parse(json);
}

function collectFiles(paths) {
    const out = [];
    for (const p of paths) {
        if (statSync(p).isDirectory()) {
            for (const f of readdirSync(p)) {
                if (f.endsWith('.txt') || f.endsWith('.json')) out.push(join(p, f));
            }
        } else {
            out.push(p);
        }
    }
    return out;
}

function validate(save) {
    const problems = [];
    const fields = new Map(); // "region.*.field" -> type seen
    let entries = 0;

    for (const [region, specials] of Object.entries(SPECIALS)) {
        const node = save[region];
        if (!node || typeof node !== 'object') continue;

        for (const [key, value] of Object.entries(node)) {
            if (specials.has(key)) continue;
            entries++;

            if (value === null || typeof value !== 'object' || Array.isArray(value)) {
                problems.push(
                    `${region}.${key} is ${Array.isArray(value) ? 'array' : typeof value}, ` +
                    `but the type says every non-special key is a structure`,
                );
                continue;
            }
            if (typeof value.count !== 'number') {
                problems.push(`${region}.${key}.count is ${typeof value.count}, expected number`);
            }
            for (const [f, v] of Object.entries(value)) {
                if (!isStructureField(v)) {
                    problems.push(`${region}.${key}.${f} is ${typeof v}, outside StructureField`);
                }
                const t = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
                if (t === 'array' || t === 'object') fields.set(`${region}.*.${f}`, t);
            }
        }
    }
    return { problems, entries, fields };
}

// ── main ─────────────────────────────────────────────────────────────────────

const paths = process.argv.slice(2);
if (paths.length === 0) {
    console.error('usage: validate-external-save.mjs <file-or-directory>...');
    process.exit(1);
}

let totalEntries = 0;
let totalProblems = 0;
const allNonScalar = new Map();

for (const file of collectFiles(paths)) {
    let save;
    try {
        save = decode(readFileSync(file, 'utf8'));
    } catch (err) {
        console.log(`${basename(file)}: SKIPPED — ${err.message}`);
        continue;
    }

    const { problems, entries, fields } = validate(save);
    totalEntries += entries;
    totalProblems += problems.length;
    for (const [k, v] of fields) allNonScalar.set(k, v);

    const reach = ['portal', 'interstellar', 'tauceti', 'eden', 'galaxy']
        .map(r => `${r} ${Object.keys(save[r] ?? {}).length}`)
        .join('  ');

    console.log(
        `${basename(file).slice(0, 40).padEnd(42)} v${String(save.version ?? '?').padEnd(8)} ` +
        `${String(entries).padStart(4)} structures  [${reach}]  ` +
        (problems.length ? `${problems.length} PROBLEM(S)` : 'ok'),
    );
    for (const p of problems.slice(0, 10)) console.log(`     ${p}`);
}

console.log(`\n${totalEntries} structure entries validated, ${totalProblems} problem(s).`);

if (allNonScalar.size) {
    console.log('\nNon-scalar structure fields seen (all must be within StructureField):');
    for (const [k, t] of [...allNonScalar].sort()) console.log(`   ${k}  ${t}`);
}

process.exit(totalProblems > 0 ? 1 : 0);
