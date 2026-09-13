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

    // From civics.ts
    /** Raise or lower the tax rate; honours keyMultiplier when n is omitted. */
    adjustTax: null as any,
    /** Toggle the MAD missiles between live and safe. */
    madArm: null as any,
    /** Fire the missiles: detonation animation, then a game reset. */
    madLaunch: null as any,
    /** Switch government; refused while a revolution is running. */
    setGovernment: null as any,
    registerGovPopovers: null as any,

    // From jobs.ts
    /** Ordered row specs for the job list. */
    getJobRows: null as any,
    adjustJob: null as any,
    adjustServantJob: null as any,
    setDefaultJob: null as any,
    jobScale: null as any,
    adjustCrafter: null as any,
    crafterCap: null as any,

    // From index.ts
    /** Draws a legacy tab's markup into its panel and binds Vue to it. */
    loadTab: null as any,

    // From main.ts
    execGameLoops: null as any,
};
