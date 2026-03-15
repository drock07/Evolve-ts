/**
 * Reactive state bridge between the game engine and React.
 *
 * The engine mutates `global` directly — this module provides a
 * subscribe/notify mechanism so React components can re-render
 * when the game state changes.
 *
 * Notification is batched per game tick: the render functions
 * (fastLoopRender, midLoopRender, longLoopRender) call
 * `notifyStateChange()` once per pass rather than on every
 * individual mutation.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

/** A monotonically increasing tick counter used as a snapshot identity for useSyncExternalStore. */
let tick = 0;

/**
 * Subscribe to state change notifications.
 * Returns an unsubscribe function.
 * Compatible with React's `useSyncExternalStore`.
 */
export function subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

/**
 * Returns the current tick count.
 * Used as the `getSnapshot` function for `useSyncExternalStore` —
 * React will re-render when this value changes.
 */
export function getSnapshot(): number {
    return tick;
}

/**
 * Call this at the end of each render pass to notify all
 * subscribed React components that game state has changed.
 */
export function notifyStateChange(): void {
    tick++;
    listeners.forEach(fn => fn());
}
