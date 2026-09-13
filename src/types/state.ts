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

/** Values the engine stores directly on a job or config record. */
export type StateScalar = number | string | boolean | undefined;

/**
 * Values a structure record can hold.
 *
 * Wider than StateScalar: of the 320 struct() defaults declared in the actions
 * tree, seven fields are arrays or nested objects rather than scalars. Those
 * seven are also named individually on GameStructureNamed below, which is what
 * keeps the common ones precise — this union only governs keys read
 * dynamically, where the engine could legitimately hold any of these.
 */
export type StructureField =
    number | string | boolean | unknown[] | Record<string, unknown> | undefined;

// ── global.city ──────────────────────────────────────────────────────────────

/**
 * A constructed structure. Shared by global.city and global.space, whose
 * entries have the identical shape.
 *
 * `count`, `time` and `bn` appear on every structure in both save fixtures;
 * `on` only on the ~half that consume power. The index signature carries
 * per-structure extras — smelter fuel counts (`Wood`, `Coal`, `Star`), foundry
 * craft assignments (`Plywood`, `Brick`, …), factory production splits (`Lux`,
 * `Alloy`, …) — which are all numbers in practice.
 */
export interface GameStructure {
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

    // Non-scalar fields do occur — `hearts`, `ships`, `spawned` and `mechs`
    // are lists, `cargo` and `status` are maps, and `mechs` and `enemy` are
    // declared as either a list or a count depending on the structure. They
    // are covered by the index signature rather than named here: naming them
    // pins a union onto every structure and costs about a hundred errors at
    // call sites that already know which shape they are holding.

    [extra: string]: StructureField;
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
 * `CityCalendar` is not a `GameStructure`. The cost is that a special key
 * reads as `Fixed & GameStructure`; the benefit is that both halves stay
 * typed instead of collapsing to `any`.
 */
export type CityState = CityFixed & { [structure: string]: GameStructure };

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

// ── global.resource ──────────────────────────────────────────────────────────

/**
 * A resource.
 *
 * Unlike city and civic, this subtree is a clean uniform map — every one of
 * the 123 entries across both fixtures has the nine required fields below,
 * and there are no special keys mixed in. The current species is itself a
 * resource here (`global.resource[global.race.species]` is the population).
 */
export interface GameResource {
    name: string;
    display: boolean;
    amount: number;
    /** Storage cap; -1 means uncapped. */
    max: number;
    /** Per-second change shown in the UI. */
    diff: number;
    delta: number;
    rate: number;
    crates: number;
    /** Absent on records built by the pre-1.4 migration paths in vars.ts. */
    containers?: number;

    /** Whether crates/containers can be assigned. Absent on a few specials. */
    stackable?: boolean;
    /**
     * Show a storage bar in the UI. Written by useResourceData, never
     * persisted — a view concern living on the model.
     */
    bar?: boolean;
    /**
     * Read by the magic-universe alchemy code in main.ts and assigned
     * nowhere, here or upstream, so it is permanently undefined and that
     * branch is dead. Typed as it is used; whether the distinction should
     * exist at all is a balance question, not a typing one.
     */
    basic?: boolean;
    /** Market value, on tradeable resources only. */
    value?: number;
    /** Net trade-route volume, on tradeable resources only. */
    trade?: number;
    /** Generation bookkeeping, used by a couple of special resources. */
    gen?: number;
    gen_d?: number;
}

export type ResourceState = Record<string, GameResource>;

// ── global.tech ──────────────────────────────────────────────────────────────

/**
 * Researched technologies, keyed by tech id, valued by tier reached.
 * A tech that has not been researched is absent rather than zero, so most
 * call sites test `global.tech['x']` for truthiness before reading it.
 */
export type TechState = Record<string, number>;

// ── global.genes / global.blood ──────────────────────────────────────────────

/** Minor gene levels, keyed by trait name. */
export type GenesMinor = Record<string, number>;

/** Genetic upgrade levels, plus the nested minor-gene map. */
export type GenesState = { minor: GenesMinor } & Record<string, number>;

/** Blood ritual upgrade levels. */
export type BloodState = Record<string, number>;

// ── global.stats ─────────────────────────────────────────────────────────────

/** An earned achievement. `l` is the level; universe ids carry per-universe levels. */
export interface StatsAchievement {
    l: number;
    [universe: string]: number;
}

/** Banana-feat progress flags. */
export interface StatsBanana {
    l: boolean;
    h: boolean;
    a: boolean;
    e: boolean;
    m: boolean;
    mg: boolean;
}

/** The keys of `global.stats` that are not plain counters. */
export interface StatsFixed {
    /** Wall-clock ms at which this run began. */
    start: number;
    days: number;
    tdays: number;

    achieve: Record<string, StatsAchievement>;
    feat: Record<string, number>;
    banana: Record<string, StatsBanana>;
    spire: Record<string, unknown>;
    /** Only present once the relevant content has been reached. */
    synth?: Record<string, unknown>;
    womling?: Record<string, unknown>;
}

/**
 * Everything else in `global.stats` is a lifetime counter — days, kills,
 * resets, resources harvested. See the note on `CityState` for why this is
 * an intersection.
 */
export type StatsState = StatsFixed & Record<string, number>;

// ── the root ─────────────────────────────────────────────────────────────────

/**
 * Keys that exist on a live `global` but not on the new-game skeleton in
 * vars.ts — they are added by newGameData(), by the save-migration chain, or
 * by a loaded save.
 *
 * The untyped ones are deliberately `{}` rather than a looser type: that makes
 * the key itself resolve while member access still reports an error, which
 * keeps each of these subtrees on the worklist instead of silently passing.
 */
export interface GameStateRuntime {
    version: string;
    /** True until the first meaningful action of a run. */
    new: boolean;
    /** Power grid snapshot, rebuilt each long loop. */
    power: unknown[];

    /** Prestige currencies. Absent from saves older than 1.3. */
    prestige?: PrestigeState;
    /** Support pools per region. */
    support: SupportState;

    // Not yet typed — each is a subtree of its own.
    arpa: {};
    custom: {};
    galaxy: GalaxyState;
    govern: {};
    lastMsg: {};
    pillars: {};
    queue: {};
    r_queue: {};
    settings: {};
    special: {};
    starDock: StarDockState;
}

// ── global.space ─────────────────────────────────────────────────────────────

/**
 * Space structures, flat rather than nested by sector — `spc_casino` and
 * `spc_moon_base` sit side by side, with the sector encoded in the id. The
 * entries have the same shape as city structures.
 */
export interface SpaceFixed {
    /** Syndicate pressure per region, keyed by region id. */
    syndicate?: Record<string, number>;
    /** Orbital positions, used by the Tau Ceti transit calculations. */
    position?: Record<string, number>;
}

export type SpaceState = SpaceFixed & Record<string, GameStructure>;

// ── global.race ──────────────────────────────────────────────────────────────

/** A prestige currency as stored on pre-1.3 saves, before global.prestige existed. */
export interface RacePrestige {
    count: number;
    /** Anti-plasmids, on the Plasmid record only. */
    anti?: number;
}

/** The keys of `global.race` that are not trait levels. */
export interface RaceFixed {
    species: string;
    universe: string;
    gods: string;
    old_gods: string;
    /** Species picked at the sentience step. */
    chose?: string;
    ascended?: boolean;
    seeded?: boolean;
    /**
     * Minor gene levels contributed by the species, and structures/techs held
     * in reserve across a reset. Both are genuinely absent on the race
     * skeleton the reset paths in resets.ts build, and are repopulated by the
     * define*() passes straight afterwards.
     */
    minor?: Record<string, number>;
    purgatory?: Record<string, Record<string, unknown>>;

    // Prestige currencies lived here before the 1.3 migration moved them to
    // global.prestige. Still read by that migration, so still typed.
    Plasmid?: RacePrestige;
    Phage?: RacePrestige;
    Dark?: RacePrestige;
    Harmony?: RacePrestige;
    AICore?: RacePrestige;
}

/**
 * Everything else on `global.race` is a trait level, keyed by trait name —
 * which is why the engine reads it as `global.race['brute']` throughout. A
 * trait the species lacks is absent rather than zero.
 */
export type RaceState = RaceFixed & Record<string, number>;

// ── global.prestige ──────────────────────────────────────────────────────────

/** Prestige currencies, post-1.3. Keyed by resource name. */
export type PrestigeState = Record<string, RacePrestige>;

// ── global.evolution ─────────────────────────────────────────────────────────

/** An evolution-phase upgrade; `count` is how many times it has been bought. */
export interface EvolutionAction {
    count: number;
}

/** The keys of `global.evolution` that are not upgrades. */
export interface EvolutionFixed {
    dna?: number;
    /** Target DNA for the final evolution step. */
    final?: number;
    /** One-shot flags marking that a prestige bonus has been applied. */
    mloaded?: number;
    gmloaded?: number;
    gselect?: boolean;
}

/**
 * Evolution-phase progress. Same shape of problem as `global.city`: upgrade
 * records share a namespace with a few scalar flags.
 */
export type EvolutionState = EvolutionFixed & Record<string, EvolutionAction>;

// ── global.support ───────────────────────────────────────────────────────────

/**
 * Support-consuming structures per region, keyed by region id. Each value is
 * a list of structure ids drawing on that region's support pool.
 */
export type SupportState = Record<string, string[]>;

// ── the region subtrees ──────────────────────────────────────────────────────
//
// portal, interstellar, tauceti, eden, galaxy and starDock are all structure
// maps in the same shape as city and space. None of them appears in either
// save fixture, so unlike every other type here these were not derived from
// save data — they come from the struct() declarations in the actions tree,
// which is the same source initStruct() uses to create each record, plus the
// explicit initialisers for the handful of special keys.

/** Hell's fortress state. Initialised in portal.ts and tech.ts. */
export interface PortalFortress {
    threat: number;
    garrison: number;
    walls: number;
    repair: number;
    patrols: number;
    patrol_size: number;
    siege: number;
    /** 'Yes' / 'No' rather than a boolean. */
    notify: string;
    s_ntfy: string;
    nocrew: boolean;
    [extra: string]: StateScalar;
}

/**
 * The Demon Lord throne.
 *
 * Declared through struct() like a building, but it is not one — it has no
 * `count`. Typed as a special key so that GameStructure can keep `count`
 * required for the 319 structures that genuinely have it.
 */
export interface PortalThrone {
    /** Demon lords currently in the fight. */
    enemy: unknown[];
    /** Collected heart tokens. */
    hearts: unknown[];
    spawned: unknown[];
    points: number;
    skill: boolean;
    [extra: string]: StructureField;
}

export interface PortalFixed {
    fortress: PortalFortress;
    throne?: PortalThrone;
    /** Hell observation log: display settings plus accumulated statistics. */
    observe: {
        settings: Record<string, unknown>;
        stats: Record<string, unknown>;
    };
}

export type PortalState = PortalFixed & { [structure: string]: GameStructure };

/** Interstellar has no special keys — every entry is a structure. */
export type InterstellarState = Record<string, GameStructure>;

/** Tau Ceti likewise; alien_space_station is an ordinary { count, on } record. */
export type TauCetiState = Record<string, GameStructure>;

export interface EdenFixed {
    /** Elysium's fortress, a different shape from Hell's. */
    fortress?: {
        fortress: number;
        patrols: number;
        armory: number;
        detector: number;
        [extra: string]: StateScalar;
    };
    /** Rival isle strengths. */
    enemy_isle?: { wt: number; et: number; g: number };
    palace?: { energy: number; rate: number; [extra: string]: StateScalar };
}

export type EdenState = EdenFixed & { [structure: string]: GameStructure };

/** Ships stationed at one galactic sector, by class. */
export interface GalaxyDefense {
    scout_ship: number;
    corvette_ship: number;
    frigate_ship: number;
    cruiser_ship: number;
    dreadnought: number;
    [extra: string]: number;
}

export interface GalaxyFixed {
    /** Fleet assignments, keyed by sector id. */
    defense?: Record<string, GalaxyDefense>;
    /** Trade route allocation; f0..f8 are the per-good splits. */
    trade?: { max: number; cur: number; [freight: string]: number };
    /** The two randomly chosen alien species, by race id. */
    alien1?: { id: string };
    alien2?: { id: string };
}

export type GalaxyState = GalaxyFixed & { [structure: string]: GameStructure };

/** The bioseed launch facility. Three structures, no special keys. */
export type StarDockState = Record<string, GameStructure>;
