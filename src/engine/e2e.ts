/**
 * Whether the page is running under the end-to-end test driver.
 *
 * Its own module on purpose. Both the engine and src/testHooks.ts need this,
 * but testHooks imports the actions tree, and pulling that into the engine's
 * import chain is enough to break the boot — so the shared piece is this file,
 * which imports nothing.
 */
export function isE2E(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).has('e2e');
}
