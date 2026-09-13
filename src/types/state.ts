/**
 * Typed slices of the game state tree (`global` in src/vars.ts).
 *
 * These are written from evidence rather than guessed: the shapes below were
 * derived by profiling the committed save fixtures in tests/fixtures/saves,
 * cross-checked against how vars.ts and jobs.ts populate them. Subtrees are
 * added one at a time — see `GameState` in vars.ts for how a typed slice is
 * grafted onto the otherwise inferred tree.
 *
 * Two things worth knowing before adding more:
 *
 * 1. Each of these subtrees is really a uniform map with a handful of special
 *    keys mixed into the same namespace — `global.city` holds ~43 structures
 *    alongside `calendar`, `morale` and `market`; `global.civic` holds ~30 jobs
 *    alongside `taxes`, `govern` and `garrison`. That is modelled below as an
 *    intersection, which is an honest description of the current shape, not an
 *    endorsement of it. Separating the maps out (`city.structures`, `civic.jobs`)
 *    would be the real fix, and it is a save-migration change, not a typing one.
 *
 * 2. Membership is not obvious from the name. `city.trade` and `city.garrison`
 *    are structures, not special keys; `civic.craftsman` is an ordinary job.
 *    Check a save before assuming.
 */

// ── Shared ───────────────────────────────────────────────────────────────────

/** Values the engine stores directly on a structure or job record. */
export type StateScalar = number | string | boolean | undefined;

// ── global.city ──────────────────────────────────────────────────────────────

/**
 * A constructed structure.
 *
 * `count`, `time` and `bn` appear on every structure in both save fixtures;
 * `on` only on the ~half that consume power. The index signature carries
 * per-structure extras — smelter fuel counts (`Wood`, `Coal`, `Star`), foundry
 * craft assignments (`Plywood`, `Brick`, …), factory production splits (`Lux`,
 * `Alloy`, …) — which are all numbers in practice.
 */
export interface CityStructure {
    /** How many are built. */
    count: number;
    /** How many are powered on, for structures that draw power. */
    on?: number;
    /** Build-queue bookkeeping. */
    time?: string;
    /**
     * Build notification state. Overloaded: sometimes a boolean flag,
     * sometimes a string. Worth separating when the save format is next
     * revised.
     */
    bn?: string | boolean;
    [extra: string]: StateScalar;
}

export interface CityCalendar {
    day: number;
    year: number;
    /** Set by setWeather(); absent on a freshly reset calendar. */
    season?: number;
    weather: number;
    temp: number;
    moon: number;
    wind: number;
    orbit: number;
}

export interface CityMorale {
    current: number;
    cap: number;
    potential: number;
    unemployed: number;
    stress: number;
    entertain: number;
    leadership: number;
    season: number;
    [extra: string]: number;
}

export interface CityMarket {
    qty: number;
    mtrade: number;
    trade: number;
    active: boolean;
}

/** The keys of `global.city` that are not structures. */
export interface CityFixed {
    calendar: CityCalendar;
    morale: CityMorale;
    market: CityMarket;
    /** Per-resource geological modifiers for the current planet. */
    geology: Record<string, number>;
    /** Planet traits, e.g. ['toxic']. */
    ptrait: string[];
    biome: string;
    powered: boolean;
    power: number;
    /** Absent until the first power-producing structure exists. */
    power_total?: number;
    sun: number;
    cold: number;
    hot: number;

    // Transient event state, parked in the same namespace as the structures.
    // A clearer shape would give these their own home (global.city.events, or
    // global.event) rather than sharing keys with buildings.
    /** Flare-storm countdown, ticked down each long loop. */
    firestorm?: number;
    /** Evil-race slaughter flag. */
    slaughter?: number;
    /** Overflow torment counter. */
    tormented?: number;
    /** Race ids for the unfathomable trait's surface dwellers. */
    surfaceDwellers?: string[];
}

/**
 * Intersection rather than an interface with an index signature: TypeScript
 * requires a declared property to be assignable to the index type, and
 * `CityCalendar` is not a `CityStructure`. The cost is that a special key
 * reads as `Fixed & CityStructure`; the benefit is that both halves stay
 * typed instead of collapsing to `any`.
 */
export type CityState = CityFixed & { [structure: string]: CityStructure };

// ── global.civic ─────────────────────────────────────────────────────────────

/**
 * A job. Uniform across all 46 job records in the save fixtures — every field
 * here was present on every one of them.
 */
export interface CivicJob {
    job: string;
    display: boolean;
    workers: number;
    /** Maximum assignable workers; -1 means unlimited. */
    max: number;
    /**
     * Per-worker output multiplier. Optional because newGameData() creates
     * 'hunter' and 'unemployed' without one.
     */
    impact?: number;

    // Present on every job in both save fixtures, but loadJob() in jobs.ts
    // creates the record with only the five fields above and fills these in
    // afterwards — so they are optional at construction, not in a live save.
    name?: string;
    assigned?: number;
    stress?: number;
}

export interface CivicGarrison {
    display: boolean;
    disabled: boolean;
    rate: number;
    progress: number;
    tactic: number;
    workers: number;
    wounded: number;
    raid: number;
    [extra: string]: StateScalar;
}

export interface CivicTaxes {
    tax_rate: number;
    display: boolean;
}

export interface CivicGovernment {
    type: string;
    /** Revolution countdown. */
    rev: number;
    /** Foreign relations timer. */
    fr: number;
    [extra: string]: StateScalar;
}

/** The keys of `global.civic` that are not jobs. */
export interface CivicFixed {
    govern: CivicGovernment;
    // These three are absent for the whole evolution phase and only appear
    // once a civilization exists — confirmed against both save fixtures by
    // tests/unit/state-shapes.test.ts.
    taxes?: CivicTaxes;
    garrison?: CivicGarrison;
    mad?: { display: boolean; armed: boolean };
    /** Rival governments, keyed gov0..govN. */
    foreign: Record<string, Record<string, StateScalar>>;
    homeless: number;
    /** Default job new citizens are assigned to. */
    d_job: string;
    new: number;
    /**
     * Transient: newGameData() parks the starting population here to seed the
     * first job, then deletes it. A scratch value in persistent state — it
     * belongs in a local, not on the save tree.
     */
    free?: number;
}

/** See the note on `CityState` for why this is an intersection. */
export type CivicState = CivicFixed & { [job: string]: CivicJob };
