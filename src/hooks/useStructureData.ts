/**
 * Bridges engine state to a structure button.
 *
 * The Vue instance setAction() built read a slice of `global` and a handful of
 * filters; those filters are plain derivations here, recomputed each tick.
 *
 * The engine callables arrive through the context rather than being imported.
 * setAction lives in actions.ts and already holds all of them, several are not
 * exported, and — more to the point — importing actions.ts or functions.ts
 * from a hook risks dragging the legacy modules into the React entry chain,
 * which has broken the boot twice. Passing them in keeps this file's imports
 * to `global` and the locale.
 */

import { useCallback } from 'react';
import { global, keyMultiplier } from '../vars';
import { loc } from '../locale';
import { useGameTick } from './useGameState';
import { notifyStateChange } from '../state';
import { StructureData, StructureCallbacks, StructurePower } from '../components/StructureButton';

/** Engine helpers setAction uses, handed over by the call site. */
export interface StructureEngine {
    adjustCosts: (c_action: any) => Record<string, () => number>;
    checkPowerRequirements: (c_action: any) => boolean;
    easterEgg: (num: number, day: number) => string;
    trickOrTreat: (num: number, day: number, header: boolean) => string;
    templeCount: (zig?: boolean) => number;
    /** Runs the action — building, researching, whatever it is. */
    runAction: () => void;
    /** Announces the action's description to a screen reader. */
    describe: () => void;
    /** Opens the options modal, or runs the action's own sAction. */
    openSpecial: () => void;
    /** Queues the action's postPower callback, when it has one. */
    postPower: (on: boolean) => void;
}

export interface StructureContext {
    c_action: any;
    /** The region key into `global`, e.g. 'city' or 'space'. */
    action: string;
    /** The structure key within that region. */
    type: string;
    /** Old-tech rendering: a plain label, no controls. */
    old: boolean;
    /** Prediction rendering, from the build queue's forecast. */
    prediction: boolean;
    engine: StructureEngine;
}

/** The structure's own record in `global`, when it has one. */
function record(ctx: StructureContext): any {
    return global[ctx.action]?.[ctx.type];
}

/** Cost classes and data attributes, as setAction computed them. */
function costs(ctx: StructureContext): { classes: string[]; data: Record<string, number> } {
    const classes: string[] = [];
    const data: Record<string, number> = {};
    if (!ctx.c_action['cost']) return { classes, data };

    const raw = ctx.action !== 'genes' && ctx.action !== 'blood'
        ? ctx.engine.adjustCosts(ctx.c_action)
        : ctx.c_action.cost;

    for (const res of Object.keys(raw)) {
        const amount = raw[res]();
        if (amount > 0) {
            classes.push(`res-${res}`);
            data[res] = amount;
        }
    }
    return { classes, data };
}

/** The action's own extra class: its `class`, its aura, or the precog marker. */
function extraClass(ctx: StructureContext): string {
    if (ctx.prediction) return 'precog';
    const c = ctx.c_action['class'];
    if (c) return typeof c === 'function' ? c() : c;
    if (ctx.c_action['aura'] && ctx.c_action.aura()) return ctx.c_action.aura();
    return '';
}

/**
 * The built count.
 *
 * Three sources, in the order setAction consulted them: an action's own
 * count(), the region record's count, and the blood tree's grant counter.
 */
function count(ctx: StructureContext): number | null {
    if (ctx.c_action['count']) {
        const n = ctx.c_action.count();
        // city-gift shows nothing until there is more than one.
        if (n > 0 && (ctx.c_action.id !== 'city-gift' || n > 1)) return n;
        return null;
    }

    const rec = record(ctx);
    if (ctx.action !== 'tech' && rec && rec.count >= 0) {
        // Temples and ziggurats report an effective count, not a built one.
        if (['temple', 'ziggurat'].includes(ctx.type)) {
            return ctx.engine.templeCount(ctx.type !== 'temple');
        }
        return rec.count;
    }

    if (ctx.action === 'blood') {
        const grant = ctx.c_action.grant?.[0];
        if (grant && global[ctx.action]?.[grant] > 0 && ctx.c_action.grant[1] === '*') {
            return global[ctx.action][grant];
        }
    }
    return null;
}

/**
 * The seasonal substitutions the p_on and p_off filters made.
 *
 * Specific structures swap their readout for an egg or a trick at a specific
 * value. The structure differs by universe — the casino is in the city
 * normally and in space after a cataclysm — which is why each case names
 * several ids.
 */
function poweredOnHtml(ctx: StructureContext, on: number): string {
    const id = ctx.c_action.id;
    const labId = (id === 'city-biolab' && !global.race['cataclysm'] && !global.race['orbit_decayed'])
        || ((global.race['cataclysm'] || global.race['orbit_decayed']) && id === 'space-exotic_lab')
        || (global.tech['isolation'] && id === 'tauceti-infectious_disease_lab')
        || (global.race['warlord'] && id === 'portal-twisted_lab');

    if (labId) {
        const egg = ctx.engine.easterEgg(12, 12);
        if (on === 0 && egg.length > 0) return egg;
    }
    else if (id === 'city-garrison' || id === 'space-space_barracks' || id === 'portal-brute') {
        const trick = ctx.engine.trickOrTreat(1, 14, true);
        const num = id === 'city-garrison' || id === 'portal-brute' ? 13 : 0;
        if (on === num && trick.length > 0) return trick;
    }
    return String(on);
}

function poweredOffHtml(ctx: StructureContext, on: number): string {
    const id = ctx.c_action.id;
    const value = (record(ctx)?.count ?? 0) - on;

    const casino = (id === 'city-casino' && !global.race['cataclysm'] && !global.race['orbit_decayed'])
        || (id === 'space-spc_casino' && (global.race['cataclysm'] || global.race['orbit_decayed']))
        || (id === 'tauceti-tauceti_casino' && global.tech['isolation'])
        || (id === 'portal-hell_casino' && global.race['warlord']);

    if (casino) {
        const egg = ctx.engine.easterEgg(5, 12);
        if (value === 0 && egg.length > 0) return egg;
    }
    return String(value);
}

function power(ctx: StructureContext): StructurePower | null {
    // Fixed readouts: the action supplies both numbers and neither is clickable.
    if (ctx.c_action['on'] || ctx.c_action['off']) {
        return {
            onHtml: ctx.c_action['on'] ? String(ctx.c_action.on()) : '',
            offHtml: ctx.c_action['off'] ? String(ctx.c_action.off()) : '',
            onLabel: '', offLabel: '',
            interactive: false,
        };
    }

    const switchable = ctx.c_action['switchable']
        ? ctx.c_action.switchable()
        : (ctx.c_action['powered'] && global.tech['high_tech'] && global.tech['high_tech'] >= 2
            && ctx.engine.checkPowerRequirements(ctx.c_action));
    if (!switchable) return null;

    const rec = record(ctx);
    const on = rec?.on ?? 0;
    return {
        onHtml: poweredOnHtml(ctx, on),
        offHtml: poweredOffHtml(ctx, on),
        onLabel: `on: ${on}`,
        offLabel: `off: ${(rec?.count ?? 0) - on}`,
        interactive: true,
    };
}

export function useStructureData(ctx: StructureContext): {
    data: StructureData;
    callbacks: StructureCallbacks;
} {
    useGameTick();

    const { engine } = ctx;

    const onAction = useCallback(() => {
        // Touch devices act on touchend instead, which the legacy handler
        // guarded for; the click path is the same either way.
        engine.runAction();
        notifyStateChange();
    }, [engine]);

    const onDescribe = useCallback(() => {
        engine.describe();
    }, [engine]);

    const onSpecial = useCallback(() => {
        engine.openSpecial();
        notifyStateChange();
    }, [engine]);

    /** Both power controls step by keyMultiplier, as every stepped control does. */
    const onPowerOn = useCallback(() => {
        const rec = global[ctx.action]?.[ctx.type];
        if (rec) {
            for (let i = 0; i < keyMultiplier(); i++) {
                if (rec.on < rec.count) rec.on++;
                else break;
            }
            if (ctx.c_action['postPower']) engine.postPower(true);
        }
        notifyStateChange();
    }, [ctx, engine]);

    const onPowerOff = useCallback(() => {
        const rec = global[ctx.action]?.[ctx.type];
        if (rec) {
            for (let i = 0; i < keyMultiplier(); i++) {
                if (rec.on > 0) rec.on--;
                else break;
            }
            if (ctx.c_action['postPower']) engine.postPower(false);
        }
        notifyStateChange();
    }, [ctx, engine]);

    const title: string = typeof ctx.c_action.title === 'string'
        ? ctx.c_action.title
        : ctx.c_action.title();

    const rec = record(ctx);
    const built = count(ctx);
    // A structure that has not been built yet shows only its button: the
    // legacy hid the count, options and power controls with inline styles at
    // creation. Here it is simply a matter of not rendering them.
    const unbuilt = ctx.action !== 'tech' && rec && rec.count === 0;

    const { classes, data: costData } = costs(ctx);
    const special = !ctx.c_action.hasOwnProperty('special')
        ? false
        : (typeof ctx.c_action['special'] === 'function'
            ? ctx.c_action.special()
            : ctx.c_action['special'] === true);

    return {
        data: {
            title,
            costClasses: ctx.old ? [] : classes,
            costData: ctx.old ? {} : costData,
            extraClass: ctx.old ? '' : extraClass(ctx),
            activeLabel: ctx.c_action['highlight']
                ? (ctx.c_action.highlight() ? loc('active') : loc('not_active'))
                : null,
            count: unbuilt ? null : built,
            power: unbuilt ? null : power(ctx),
            special: special && !unbuilt,
            specialTitle: loc('action_options', [title]),
            repair: rec && typeof rec['repair'] !== 'undefined'
                ? { value: rec.repair, max: ctx.c_action.repair() }
                : null,
            emblem: ctx.c_action['emblem'] ? ctx.c_action.emblem() : null,
            describeLabel: `${title} description`,
        },
        callbacks: { onAction, onDescribe, onPowerOn, onPowerOff, onSpecial },
    };
}
