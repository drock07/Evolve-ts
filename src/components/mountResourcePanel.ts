import { createRoot, Root } from 'react-dom/client';
import { createElement } from 'react';

let root: Root | null = null;

/**
 * Mount the React ResourcePanel into the #resources container.
 * Call this after defineResources() has initialized global state.
 * Uses dynamic imports to avoid circular dependency issues.
 */
export async function mountResourcePanel() {
    const container = document.getElementById('resources');
    if (!container) return;

    // Lazy-load to avoid circular deps at module init time
    const [{ ResourcePanel }, { deps }, { craftCost, craftingRatio, breakdownPopover, craftingPopover }, { popover, eventActive }] = await Promise.all([
        import('./ResourcePanel'),
        import('./ResourceRow'),
        import('../resources'),
        import('../functions'),
    ]);

    // Populate late-bound deps for ResourceRow
    deps.craftCost = craftCost;
    deps.craftingRatio = craftingRatio;
    deps.breakdownPopover = breakdownPopover;
    deps.craftingPopover = craftingPopover;
    deps.popover = popover;
    deps.eventActive = eventActive;

    // Destroy any existing Vue instances on children
    $(container).find('.vb').each(function () {
        try { (this as any).__vue__?.$destroy(); } catch (e) {}
    });

    // Clear existing content
    container.innerHTML = '';

    // Mount React
    if (root) {
        root.unmount();
    }
    root = createRoot(container);
    root.render(createElement(ResourcePanel));
}
