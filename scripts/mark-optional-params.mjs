#!/usr/bin/env node
/**
 * Codemod: mark trailing parameters optional where callers already omit them.
 *
 * The original .js -> .ts rename left every parameter required, so the ~17,000
 * TS2554 "Expected N arguments, but got M" errors are not bugs — they are the
 * type system not knowing what JavaScript always allowed. This resolves each
 * failing call to the declaration it actually targets, takes the *minimum*
 * arity observed across every call site, and marks parameters from that index
 * onward with `?`.
 *
 * Deliberately conservative. It skips a parameter that already has `?`, a
 * default value, or is a rest element, and it never touches a declaration
 * outside src/. Run with --dry to see the plan without writing.
 */

import ts from 'typescript';
import { readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const DRY = process.argv.includes('--dry');
const ROOT = process.cwd();
const SRC = resolve(ROOT, 'src');

function loadProgram() {
    const configPath = ts.findConfigFile(ROOT, ts.sys.fileExists, 'tsconfig.json');
    const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(config, ts.sys, ROOT);
    return ts.createProgram(parsed.fileNames, parsed.options);
}

const program = loadProgram();
const checker = program.getTypeChecker();

/** declaration node -> smallest argument count any caller passes */
const minArgs = new Map();

let considered = 0;
let unresolved = 0;

for (const file of program.getSourceFiles()) {
    if (file.isDeclarationFile) continue;

    for (const diag of program.getSemanticDiagnostics(file)) {
        if (diag.code !== 2554) continue;
        considered++;

        const node = findNodeAt(file, diag.start);
        const call = findEnclosingCall(node);
        if (!call) { unresolved++; continue; }

        const signature = checker.getResolvedSignature(call);
        const decl = signature?.declaration;
        if (!decl || !decl.parameters) { unresolved++; continue; }

        // Only rewrite code we own.
        const declFile = decl.getSourceFile().fileName;
        if (!resolve(declFile).startsWith(SRC)) { unresolved++; continue; }

        const count = call.arguments.length;
        const prev = minArgs.get(decl);
        if (prev === undefined || count < prev) minArgs.set(decl, count);
    }
}

function findNodeAt(root, pos) {
    let found = root;
    (function walk(node) {
        if (pos < node.getStart(root) || pos >= node.getEnd()) return;
        found = node;
        node.forEachChild(walk);
    })(root);
    return found;
}

function findEnclosingCall(node) {
    for (let n = node; n; n = n.parent) {
        if (ts.isCallExpression(n) || ts.isNewExpression(n)) return n;
    }
    return null;
}

// ── Plan the edits ───────────────────────────────────────────────────────────

/** file -> [{ pos, name }] insertion points for a `?` */
const editsByFile = new Map();
const summary = [];

for (const [decl, seen] of minArgs) {
    const params = decl.parameters;
    const fnName = decl.name?.getText?.() ?? '(anonymous)';
    const fileName = decl.getSourceFile().fileName;

    const marked = [];
    for (let i = seen; i < params.length; i++) {
        const p = params[i];
        // Already optional, has a default, or is a rest param — leave alone.
        if (p.questionToken || p.initializer || p.dotDotDotToken) continue;
        // `?` goes immediately after the parameter name.
        const list = editsByFile.get(fileName) ?? [];
        list.push({ pos: p.name.getEnd(), name: p.name.getText() });
        editsByFile.set(fileName, list);
        marked.push(p.name.getText());
    }

    if (marked.length) {
        summary.push({
            file: relative(ROOT, fileName),
            fn: fnName,
            arity: `${seen}/${params.length}`,
            marked,
        });
    }
}

summary.sort((a, b) => b.marked.length - a.marked.length || a.fn.localeCompare(b.fn));

console.log(`TS2554 diagnostics considered : ${considered}`);
console.log(`  unresolved (skipped)        : ${unresolved}`);
console.log(`declarations to change        : ${summary.length}`);
console.log(`parameters to mark optional   : ${summary.reduce((n, s) => n + s.marked.length, 0)}`);
console.log('');
for (const s of summary) {
    console.log(`  ${s.file.padEnd(22)} ${s.fn}(…)  min/total ${s.arity}  ->  ${s.marked.join(', ')}`);
}

if (DRY) {
    console.log('\n--dry: nothing written.');
    process.exit(0);
}

// ── Apply, right-to-left so earlier offsets stay valid ────────────────────────

let filesChanged = 0;
for (const [fileName, edits] of editsByFile) {
    const text = readFileSync(fileName, 'utf8');
    const sorted = [...edits].sort((a, b) => b.pos - a.pos);
    let out = text;
    for (const e of sorted) {
        out = out.slice(0, e.pos) + '?' + out.slice(e.pos);
    }
    writeFileSync(fileName, out);
    filesChanged++;
}

console.log(`\nWrote ${filesChanged} file(s).`);
