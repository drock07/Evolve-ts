/**
 * React islands inside legacy-rendered DOM.
 *
 * Most of the UI is still drawn imperatively: jQuery builds a tree of markup
 * and `vBind` mounts a Vue instance onto it. Porting that to React a whole tab
 * at a time would mean rewriting thousands of lines before anything could be
 * verified, so instead the legacy code keeps building the container and React
 * takes over its contents — one widget at a time, each independently testable.
 *
 * The awkward part is lifecycle. Legacy code destroys and rebuilds these
 * containers freely (`clearElement` on every tab switch), so a root can find
 * its container detached from the document at any moment. This module keeps
 * roots keyed by their container element and cleans up the ones whose
 * containers have gone, which is what stops React logging warnings about
 * rendering into removed nodes and leaking a root per tab switch.
 */

import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';

/** Container element -> the React root currently rendering into it. */
const roots = new Map<Element, Root>();

/**
 * Drop roots whose containers are no longer in the document.
 *
 * Legacy `clearElement` empties a parent, which detaches our container without
 * telling us. Unmounting here rather than on a timer keeps the cleanup tied to
 * actual work, and unmount() on an already-detached tree is safe.
 */
function reapDetachedRoots(): void {
    for (const [el, root] of roots) {
        if (!el.isConnected) {
            try {
                root.unmount();
            } catch {
                // The tree may already be gone; nothing to do about it.
            }
            roots.delete(el);
        }
    }
}

/**
 * Render `node` into `container`, reusing the existing root if one is already
 * rendering there.
 *
 * Returns false when the container does not exist, which is the normal case
 * for a tab that has not been drawn: callers should treat it as "not now"
 * rather than an error. That silence is deliberate — jQuery behaves the same
 * way, and a legacy draw into an absent node is a no-op, not a crash.
 */
export function mountIsland(container: Element | null, node: ReactNode): boolean {
    reapDetachedRoots();

    if (!container || !container.isConnected) return false;

    let root = roots.get(container);
    if (!root) {
        root = createRoot(container);
        roots.set(container, root);
    }
    root.render(node);
    return true;
}

/** Unmount the island rendering into `container`, if there is one. */
export function unmountIsland(container: Element | null): void {
    if (!container) return;
    const root = roots.get(container);
    if (!root) return;
    try {
        root.unmount();
    } catch {
        // Already torn down.
    }
    roots.delete(container);
}

/** Number of live islands. Exposed for the tests that check for root leaks. */
export function islandCount(): number {
    reapDetachedRoots();
    return roots.size;
}
