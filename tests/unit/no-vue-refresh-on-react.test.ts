import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

/**
 * Nothing may ask Vue to refresh an element React owns.
 *
 * `vBind(el, 'update')` forces a Vue re-render and is a silent no-op when the
 * element has no Vue instance on it. So the moment a widget is ported, every
 * refresh call elsewhere in the engine that pointed at it stops working — and
 * worse than stops: those calls exist to repaint immediately after a click,
 * where React needs notifyStateChange(). Without it the control looks
 * unresponsive until the next tick, which is the same quiet failure the notify
 * lint rule was written for.
 *
 * Twenty-six of these had accumulated behind the garrison and foundry ports
 * before anyone looked.
 *
 * The React-owned set is derived from the mount modules rather than listed
 * here, so porting a widget updates this check automatically. A runtime
 * version of this was tried first and discarded: it only sees code paths that
 * happen to execute during a test, and it put a branch on a hot path to do it.
 */

/** Container ids the mount modules render islands into. */
function reactOwnedContainers(): Set<string> {
    const dir = resolve(process.cwd(), 'src/components');
    const ids = new Set<string>();

    for (const entry of readdirSync(dir)) {
        if (!/^mount.*\.tsx?$/.test(entry)) continue;
        const src = readFileSync(join(dir, entry), 'utf8');

        for (const m of src.matchAll(/getElementById\(\s*['"`]([A-Za-z0-9_-]+)['"`]\s*\)/g)) {
            ids.add(m[1]);
        }
        // Ternaries like getElementById(full ? 'garrison' : 'c_garrison').
        for (const m of src.matchAll(/getElementById\([^)]*?\?\s*['"`]([A-Za-z0-9_-]+)['"`]\s*:\s*['"`]([A-Za-z0-9_-]+)['"`]/g)) {
            ids.add(m[1]);
            ids.add(m[2]);
        }
        for (const m of src.matchAll(/querySelector\(\s*['"`]#([A-Za-z0-9_-]+)['"`]\s*\)/g)) {
            ids.add(m[1]);
        }
    }
    return ids;
}

interface Offence { file: string; line: number; target: string }

/** Every vBind refresh/destroy call, with the element id it targets. */
function vueRefreshTargets(): Offence[] {
    const found: Offence[] = [];
    const root = resolve(process.cwd(), 'src');

    const walk = (dir: string) => {
        for (const entry of readdirSync(dir)) {
            const full = join(dir, entry);
            if (statSync(full).isDirectory()) { walk(full); continue; }
            if (!/\.tsx?$/.test(entry)) continue;

            const lines = readFileSync(full, 'utf8').split('\n');
            lines.forEach((text, i) => {
                const m = text.match(
                    /vBind\(\s*\{\s*el:\s*[`'"]#([A-Za-z0-9_-]+)[`'"]\s*\}\s*,\s*['"](?:update|destroy)['"]/,
                );
                if (m) found.push({ file: relative(process.cwd(), full), line: i + 1, target: m[1] });
            });
        }
    };
    walk(root);
    return found;
}

describe('Vue refreshes', () => {
    it('never target an element React owns', () => {
        const owned = reactOwnedContainers();
        const offences = vueRefreshTargets().filter(o => owned.has(o.target));

        const report = offences
            .map(o => `  ${o.file}:${o.line}  refreshes #${o.target}, which React owns — use notifyStateChange()`)
            .join('\n');

        expect(offences, offences.length ? `\n${report}\n` : undefined).toEqual([]);
    });

    it('actually knows which containers React owns', () => {
        // Guards against the derivation silently returning nothing, which
        // would make the check above pass for every possible input.
        const owned = reactOwnedContainers();
        expect(owned.size).toBeGreaterThan(3);
        expect(owned).toContain('garrison');
        expect(owned).toContain('c_garrison');
    });
});
