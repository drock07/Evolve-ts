/**
 * Records where legacy popovers actually attached, so dead ones can be found.
 *
 * popover() binds jQuery handlers to whatever `elm` matches at the moment it
 * is called. That was safe while the DOM it targeted was built synchronously
 * by jQuery on the line above. It is not safe against React, which renders
 * asynchronously: the selector matches nothing, `.on()` binds to an empty set,
 * and the description silently never appears. Three had died that way before
 * anyone noticed, because everything still rendered.
 *
 * Two shapes of the same failure are recorded here:
 *
 *  - nothing matched at bind time, so the handler went nowhere;
 *  - something matched, but that node is no longer in the document — it was
 *    replaced after binding, which is what happens when jQuery and React both
 *    build the same element.
 *
 * The second is only meaningful while the panel in question is on screen.
 * Legacy tears a tab's DOM down when you switch away and rebuilds it on the
 * way back, so at any moment most of the game's popovers point at detached
 * elements and are perfectly healthy. Reading this once, from one tab, reports
 * 282 dead popovers and every one of them is a lie. The caller has to sample
 * across panel states and keep what is dead in all of them — see the audit
 * spec, which does exactly that.
 *
 * Only armed under the test driver. In a normal page this costs one isE2E()
 * check per registration and records nothing.
 */

import { isE2E } from './e2e';

export interface PopoverBinding {
    /** The popover's id, as passed to popover(). */
    id: string;
    /** The selector it bound to, as text. */
    selector: string;
    /** How many elements matched when it bound. */
    matched: number;
    /** The elements themselves, to check later whether they are still live. */
    nodes: Element[];
}

const bindings: PopoverBinding[] = [];

/** Describe `elm` as text, whether it arrived as a selector or a jQuery set. */
function describeSelector(elm: unknown): string {
    if (typeof elm === 'string') return elm;
    if (elm && typeof elm === 'object') {
        const jq = elm as { selector?: string; length?: number };
        if (typeof jq.selector === 'string' && jq.selector) return jq.selector;
        return `(jQuery set of ${jq.length ?? 0})`;
    }
    return String(elm);
}

export function recordPopoverBinding(id: string, elm: unknown, nodes: Element[]): void {
    if (!isE2E()) return;
    bindings.push({
        id: String(id),
        selector: describeSelector(elm),
        matched: nodes.length,
        nodes,
    });
}

export interface DeadPopover {
    id: string;
    selector: string;
    /** Why it is dead, for the report. */
    reason: 'never matched' | 'element replaced after binding';
}

/**
 * Is the thing this popover describes on the page right now?
 *
 * A binding that matched nothing is only a defect if its element exists — then
 * the element is there and the description is not. Plenty of popovers are
 * registered for content a given run never unlocks (a non-standard universe, a
 * simulation run), and those matching nothing is correct rather than broken.
 *
 * Only string selectors can be re-tested; a popover handed a jQuery set gives
 * nothing to re-query, so those are left to the replaced-after-binding rule.
 */
function elementExistsNow(selector: string): boolean {
    if (selector.startsWith('(')) return false;
    try {
        return document.querySelector(selector) !== null;
    } catch {
        // Not a selector CSS understands; nothing to claim either way.
        return false;
    }
}

/**
 * Popovers that cannot fire.
 *
 * Grouped by id, because legacy code re-registers popovers freely when it
 * rebuilds a panel: an id is only dead if none of its registrations currently
 * holds a live element. Without that grouping every tab switch would produce
 * false reports for the panel it tore down.
 */
export function deadPopovers(): DeadPopover[] {
    const byId = new Map<string, PopoverBinding[]>();
    for (const b of bindings) {
        const list = byId.get(b.id) ?? [];
        list.push(b);
        byId.set(b.id, list);
    }

    const dead: DeadPopover[] = [];
    for (const [id, list] of byId) {
        const live = list.some(b => b.nodes.some(n => n.isConnected));
        if (live) continue;

        const everMatched = list.some(b => b.matched > 0);
        const selector = list[list.length - 1].selector;

        // Never matched, and still nothing to match: this run simply does not
        // have that content. Not a finding.
        if (!everMatched && !elementExistsNow(selector)) continue;

        dead.push({
            id,
            selector,
            reason: everMatched ? 'element replaced after binding' : 'never matched',
        });
    }
    return dead;
}

/** Every registration seen, for reporting how much the sweep covered. */
export function popoverBindingCount(): number {
    return bindings.length;
}
