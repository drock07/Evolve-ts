/**
 * Legacy Bridge
 *
 * Holds references to legacy module functions that can't be statically
 * imported from React component files due to circular dependency chains
 * at module evaluation time.
 *
 * main.ts populates this after all modules have loaded.
 * Hook files read from it at render time (guaranteed to be populated).
 */

export const legacy = {
    // From actions.ts
    actions: null as any,
    checkAffordable: null as any,

    // From resources.ts
    craftCost: null as any,
    craftingRatio: null as any,

    // From races.ts
    races: null as any,

    // From space.ts
    universe_types: null as any,

    // From seasons.ts
    seasonDesc: null as any,

    // From functions.ts
    flib: null as any,
    gameLoop: null as any,
    loopTimers: null as any,
    initMessageQueue: null as any,
};
