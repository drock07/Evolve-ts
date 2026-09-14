/**
 * Keeps the two popover systems to one visible description between them.
 *
 * Its own module, importing nothing, for the same reason engine/e2e.ts is:
 * the React popover is used by components in the React entry chain, and
 * reaching into functions.ts for clearPopper() drags the whole legacy module
 * into that chain. That reorders module evaluation enough to break the boot —
 * which it did, with an error about `protoplasm` nowhere near the cause.
 *
 * So neither side imports the other. Each registers a closer here, and calls
 * the other's through this module.
 */

type Closer = (id?: string) => void;

let legacyCloser: Closer | null = null;
let reactCloser: Closer | null = null;

/** Registered by functions.ts with its clearPopper(). */
export function registerLegacyPopoverCloser(fn: Closer): void {
    legacyCloser = fn;
}

/** Registered by the React popover hook. */
export function registerReactPopoverCloser(fn: Closer): void {
    reactCloser = fn;
}

/**
 * Close the legacy popover, if one is showing.
 *
 * Called by the React side before it opens. clearPopper() in turn calls
 * closeReactPopover(); that does not come back here, so there is no loop.
 */
export function closeLegacyPopover(id?: string): void {
    legacyCloser?.(id);
}

/** Close the React popover, if one is showing. Called from clearPopper(). */
export function closeReactPopover(id?: string): void {
    reactCloser?.(id);
}
