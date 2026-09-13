#!/usr/bin/env node
/**
 * Profile a subtree of the game state across the committed save fixtures.
 *
 * Typing `global` one subtree at a time means knowing what each one actually
 * holds — which fields exist, which are optional, which keys are uniform map
 * entries and which are special. Reading the engine is a poor way to find
 * that out: names mislead (`city.trade` is a structure, `civic.craftsman` is
 * an ordinary job), and optionality only shows up by comparing saves from
 * different game phases.
 *
 * Usage:
 *   node scripts/profile-save-subtree.mjs resource
 *   node scripts/profile-save-subtree.mjs tech --entries
 *
 *   --entries   also profile the fields *inside* each entry, which is what
 *               you want for a subtree that is mostly a uniform map
 */

import LZString from 'lz-string';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const FIXTURE_DIR = resolve(process.cwd(), 'tests/fixtures/saves');

const subtree = process.argv[2];
const withEntries = process.argv.includes('--entries');

if (!subtree) {
    console.error('usage: profile-save-subtree.mjs <subtree> [--entries]');
    process.exit(1);
}

const fixtures = readdirSync(FIXTURE_DIR)
    .filter(f => f.endsWith('.txt'))
    .map(f => {
        const json = LZString.decompressFromBase64(
            readFileSync(resolve(FIXTURE_DIR, f), 'utf8').trim(),
        );
        return { name: f.replace(/\.txt$/, ''), data: JSON.parse(json) };
    });

const kindOf = v =>
    v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;

console.log(`Fixtures: ${fixtures.map(f => f.name).join(', ')}\n`);

// ── Top level: what kinds of value does this subtree hold, and which keys
//    appear in every fixture (required) versus only some (optional)? ─────────

const topTypes = new Map(); // type signature -> keys
const presence = new Map(); // key -> Set(fixture names)

for (const { name, data } of fixtures) {
    const node = data[subtree];
    if (!node || typeof node !== 'object') {
        console.log(`  (${name}: subtree absent)`);
        continue;
    }
    for (const [k, v] of Object.entries(node)) {
        const t = kindOf(v);
        if (!topTypes.has(t)) topTypes.set(t, new Set());
        topTypes.get(t).add(k);
        if (!presence.has(k)) presence.set(k, new Set());
        presence.get(k).add(name);
    }
}

console.log(`### global.${subtree} — top-level keys by value type`);
for (const [type, keys] of [...topTypes].sort((a, b) => b[1].size - a[1].size)) {
    console.log(`\n  [${type}]  ${keys.size} keys`);
    console.log(`    ${[...keys].sort().join(', ')}`);
}

const partial = [...presence]
    .filter(([, seen]) => seen.size < fixtures.length)
    .map(([k]) => k);
if (partial.length) {
    console.log(`\n  Present in only SOME fixtures (candidates for optional):`);
    console.log(`    ${partial.sort().join(', ')}`);
}

// ── Entry level: for a subtree that is mostly a uniform map, which fields do
//    its entries carry, and how consistently? ───────────────────────────────

if (withEntries) {
    const fields = new Map(); // field -> { types:Set, seen:number }
    let entries = 0;

    for (const { data } of fixtures) {
        const node = data[subtree];
        if (!node || typeof node !== 'object') continue;
        for (const value of Object.values(node)) {
            if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
            entries++;
            for (const [fk, fv] of Object.entries(value)) {
                const e = fields.get(fk) ?? { types: new Set(), seen: 0 };
                e.types.add(kindOf(fv));
                e.seen++;
                fields.set(fk, e);
            }
        }
    }

    console.log(`\n### entry fields (${entries} object entries sampled)`);
    console.log(`    field              type(s)              present`);
    for (const [field, e] of [...fields].sort((a, b) => b[1].seen - a[1].seen)) {
        const pct = ((e.seen / entries) * 100).toFixed(0).padStart(3);
        const flag = e.types.size > 1 ? '   <-- MIXED TYPE' : '';
        console.log(
            `    ${field.padEnd(18)} ${[...e.types].sort().join('|').padEnd(20)} ` +
            `${String(e.seen).padStart(4)}/${entries} (${pct}%)${flag}`,
        );
    }
}
