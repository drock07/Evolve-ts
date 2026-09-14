import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

/**
 * Every React callback that changes engine state must announce it.
 *
 * `global` is mutated in place and React only re-renders when
 * notifyStateChange() fires. A callback that writes without notifying leaves
 * the UI showing the old value: a controlled input snaps back, a button looks
 * unresponsive, a count stays stale — until the next game tick happens to
 * repaint it, and never at all while the game is paused.
 *
 * That fails *silently* in a running game — it reads as a ~250ms lag rather
 * than a bug — which is exactly why it has been made three times so far, once
 * shipping to the previously-migrated message queue. Vue's reactivity made
 * this automatic; React needs it explicit, so it is checked here instead of
 * remembered.
 *
 * Scope and limits, stated plainly:
 *
 *  - Only callbacks are examined: functions passed to useCallback, and object
 *    properties named onSomething. Reads during render are not callbacks and
 *    are left alone.
 *  - An assignment rooted at `global` is detected exactly, and so is one
 *    rooted at a local alias of it: `const s = global.settings` makes a write
 *    to `s.theme` a write to engine state. Aliases are collected per file by
 *    name only, so a callback parameter shadowing one would be mistaken for
 *    it — a false positive, which costs a needless notify rather than a
 *    silent stale render.
 *  - Aliases are not followed through function calls or reassignment. Passing
 *    `global.settings` to a helper that writes it is not seen here; that would
 *    take a type checker rather than a syntax walk.
 *  - A `legacy.*` call cannot be classified. legacy.adjustTax mutates,
 *    legacy.crafterCap does not, and nothing in the code says which. They are
 *    all treated as suspect, which is the safe direction for a failure mode
 *    this quiet. Genuinely read-only ones get an explicit exemption below.
 */

const ROOTS = ['src/hooks', 'src/components'];

/**
 * `legacy.*` helpers that only read. Anything not listed here is assumed to
 * mutate, so a new read-only helper used inside a callback lands here rather
 * than silently weakening the check.
 */
const READ_ONLY_LEGACY = new Set([
    'crafterCap',
    'getJobRows',
    'jobScale',
    'craftCost',
    'craftingRatio',
    'checkAffordable',
    'loopTimers',
    'seasonDesc',
    'flib',
    'registerGovPopovers',
    'registerEspPopovers',
]);

function sourceFiles(): string[] {
    const out: string[] = [];
    const walk = (dir: string) => {
        for (const entry of readdirSync(dir)) {
            const full = join(dir, entry);
            if (statSync(full).isDirectory()) walk(full);
            else if (/\.tsx?$/.test(entry)) out.push(full);
        }
    };
    for (const root of ROOTS) walk(resolve(process.cwd(), root));
    return out;
}

/**
 * Local bindings that alias into `global`, by name.
 *
 * `const s = global.settings` is common in these hooks, and a write through
 * it is every bit a write to engine state — two such callbacks shipped
 * unnotified before this was checked.
 */
function globalAliases(sf: ts.SourceFile): Set<string> {
    const names = new Set<string>();
    const visit = (node: ts.Node) => {
        if (ts.isVariableDeclaration(node) &&
            ts.isIdentifier(node.name) &&
            node.initializer &&
            rootIdentifier(node.initializer) === 'global') {
            names.add(node.name.text);
        }
        ts.forEachChild(node, visit);
    };
    visit(sf);
    return names;
}

/** The leftmost identifier of a property/element access chain. */
function rootIdentifier(node: ts.Node): string | null {
    let cur: ts.Node = node;
    while (
        ts.isPropertyAccessExpression(cur) ||
        ts.isElementAccessExpression(cur) ||
        ts.isNonNullExpression(cur)
    ) {
        cur = cur.expression;
    }
    return ts.isIdentifier(cur) ? cur.text : null;
}

interface Finding {
    file: string;
    name: string;
    line: number;
    reason: string;
}

/** Walk a callback body, reporting what it does to engine state. */
function inspectBody(body: ts.Node, aliases: Set<string>) {
    let writesGlobal = false;
    let legacyCall: string | null = null;
    let notifies = false;

    /** Does this assignment target land in `global`, directly or via an alias? */
    const isStateTarget = (target: ts.Node) => {
        const root = rootIdentifier(target);
        return root === 'global' || (root !== null && aliases.has(root));
    };

    const visit = (node: ts.Node) => {
        // global.a.b = x   /   global.a.b++   /   global.a.b += 1
        if (ts.isBinaryExpression(node) &&
            node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
            node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
            if (isStateTarget(node.left)) writesGlobal = true;
        }
        if ((ts.isPostfixUnaryExpression(node) || ts.isPrefixUnaryExpression(node)) &&
            (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken)) {
            if (isStateTarget(node.operand)) writesGlobal = true;
        }

        if (ts.isCallExpression(node)) {
            const callee = node.expression;
            if (ts.isIdentifier(callee) && callee.text === 'notifyStateChange') {
                notifies = true;
            }
            // legacy.foo(...) or legacy.foo?.(...)
            const target = ts.isNonNullExpression(callee) ? callee.expression : callee;
            if (ts.isPropertyAccessExpression(target) && rootIdentifier(target) === 'legacy') {
                const name = target.name.text;
                if (!READ_ONLY_LEGACY.has(name)) legacyCall = name;
            }
        }

        ts.forEachChild(node, visit);
    };
    visit(body);

    return { writesGlobal, legacyCall, notifies };
}

function findViolations(): Finding[] {
    const findings: Finding[] = [];

    for (const file of sourceFiles()) {
        const text = readFileSync(file, 'utf8');
        const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ES2020, true, ts.ScriptKind.TSX);

        const aliases = globalAliases(sf);

        const check = (fn: ts.Node, name: string) => {
            const body = (fn as ts.ArrowFunction).body;
            if (!body) return;
            const { writesGlobal, legacyCall, notifies } = inspectBody(body, aliases);
            if (notifies) return;
            if (!writesGlobal && !legacyCall) return;

            findings.push({
                file: relative(process.cwd(), file),
                name,
                line: sf.getLineAndCharacterOfPosition(fn.getStart(sf)).line + 1,
                reason: writesGlobal
                    ? 'assigns to engine state'
                    : `calls legacy.${legacyCall}(), which is assumed to mutate`,
            });
        };

        const visit = (node: ts.Node) => {
            // useCallback(fn, deps)
            if (ts.isCallExpression(node) &&
                ts.isIdentifier(node.expression) &&
                node.expression.text === 'useCallback' &&
                node.arguments.length > 0) {
                const fn = node.arguments[0];
                if (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) {
                    // Name it from the variable it is assigned to, if any.
                    let name = 'useCallback';
                    if (node.parent && ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)) {
                        name = node.parent.name.text;
                    }
                    check(fn, name);
                }
            }

            // { onSomething: (...) => { ... } }
            if (ts.isPropertyAssignment(node) &&
                ts.isIdentifier(node.name) &&
                /^on[A-Z]/.test(node.name.text)) {
                const fn = node.initializer;
                if (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) {
                    check(fn, node.name.text);
                }
            }

            ts.forEachChild(node, visit);
        };
        visit(sf);
    }

    return findings;
}

describe('React callbacks that change engine state', () => {
    it('always call notifyStateChange()', () => {
        const violations = findViolations();
        const report = violations
            .map(v => `  ${v.file}:${v.line}  ${v.name}() ${v.reason}, but never calls notifyStateChange()`)
            .join('\n');

        expect(violations, violations.length ? `\n${report}\n` : undefined).toEqual([]);
    });

    it('actually inspects the callbacks it claims to', () => {
        // Guards against the check silently passing because its AST matching
        // broke and it now examines nothing at all.
        const files = sourceFiles();
        expect(files.length).toBeGreaterThan(5);

        const text = files.map(f => readFileSync(f, 'utf8')).join('\n');
        expect(text).toContain('notifyStateChange');
        expect(text).toContain('useCallback');
    });
});
