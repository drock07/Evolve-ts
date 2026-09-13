/**
 * Ambient declarations for the globals this game installs at runtime.
 *
 * `src/globals.ts` hangs a handful of libraries off `window` so that the
 * ~128k lines carried over from the pre-bundler era can keep referring to
 * them by bare name, and `vars.ts` extends `Math` with its own helpers.
 * None of that is visible to the type checker on its own, which is why
 * `LZString`, `Sortable` and `Math.rand` all read as undefined.
 *
 * These declarations describe what is already there. They add no runtime
 * behaviour and deliberately stay loose — tightening them is worthwhile,
 * but belongs with the module that owns each value, not here.
 */

import type jQueryStatic from 'jquery';
import type LZStringStatic from 'lz-string';
import type SortableStatic from 'sortablejs';

declare global {
    /** Extensions installed by src/vars.ts. */
    interface Math {
        /** Integer in [min, max). Uses Math.random, unlike the save-seeded `seededRandom`. */
        rand(min: number, max: number): number;
        /** Mirror of global.warseed, refreshed when the save loads. */
        war: number;
    }

    interface Window {
        $: typeof jQueryStatic;
        jQuery: typeof jQueryStatic;
        Vue: any;
        Popper: { createPopper: (...args: any[]) => any };
        Sortable: typeof SortableStatic;
        Chart: any;
        LZString: typeof LZStringStatic;

        /** Debug surface, populated by src/debug.ts when settings.expose is on. */
        evolve: any;

        /** Save-management entry points the page's own buttons call. */
        exportGame: (...args: any[]) => any;
        importGame: (...args: any[]) => any;
        reset: (...args: any[]) => any;
        soft_reset: (...args: any[]) => any;

        /** Google Analytics, loaded by the snippet in index.html. */
        gtag?: (...args: any[]) => void;
    }

    // Referenced by bare name throughout the pre-module code, resolved at
    // runtime through window by src/globals.ts.
    const LZString: typeof LZStringStatic;
    const Sortable: typeof SortableStatic;
    const Popper: { createPopper: (...args: any[]) => any };
    const Chart: any;
    function gtag(...args: any[]): void;
}

export {};
