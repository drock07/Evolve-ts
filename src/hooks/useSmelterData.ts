/**
 * Bridges engine state to the smelter panel.
 *
 * Which rows exist is a direct translation of the chain of conditions in
 * loadSmelter: each fuel and each output is gated on its own tech, trait or
 * resource being unlocked, and two of them are readouts rather than controls
 * — a forge burns its own fuel and a star forge draws from the star, so
 * neither takes input.
 *
 * The engine helpers arrive through the context rather than being imported.
 * tooltip() and matText() are nested inside loadSmelter and cannot be
 * imported at all, and reaching into industry.ts from a hook would risk
 * dragging the legacy modules into the React entry chain — which has broken
 * the boot twice.
 */

import { useCallback } from 'react';
import { global, keyMultiplier } from '../vars';
import { loc } from '../locale';
import { useGameTick } from './useGameState';
import { notifyStateChange } from '../state';
import { SmelterData, SmelterCallbacks, AllocationOption } from '../components/SmelterPanel';

export interface SmelterEngine {
    /** Describes what a fuel costs to burn. */
    tooltip: (type: string) => string;
    /** Describes what smelting a material does. */
    matText: (type: string) => string;
    /** Colour class for a count against its maximum. */
    colorRange: (num: number, max: number) => string;
    trickOrTreat: (num: number, day: number, header: boolean) => string;
    easterEgg: (num: number) => string;
}

export interface SmelterContext {
    /** The modal reached from the gear, rather than the Industry tab row. */
    isModal: boolean;
    engine: SmelterEngine;
}

/** Fuels burn to run a smelter; these are the ones that count toward that. */
const FUEL_KEYS = ['Wood', 'Coal', 'Oil', 'Star', 'Inferno'] as const;
/** Outputs a running smelter can be pointed at. */
const METAL_KEYS = ['Iron', 'Steel', 'Iridium'] as const;

const sum = (keys: readonly string[]) =>
    keys.reduce((n, k) => n + (global.city.smelter?.[k] ?? 0), 0);

export function useSmelterData(ctx: SmelterContext): {
    data: SmelterData;
    callbacks: SmelterCallbacks;
} {
    useGameTick();

    const s = global.city.smelter;
    const { engine } = ctx;

    /**
     * Add a smelter to a fuel.
     *
     * Takes up slack under the cap if there is any — and lights a new iron
     * smelter to go with it, since a fuelled smelter with no output does
     * nothing. Otherwise it steals from another fuel, in the order the legacy
     * checked them.
     */
    const onAddFuel = useCallback((type: string) => {
        for (let i = 0; i < keyMultiplier(); i++) {
            const total = sum(FUEL_KEYS);
            if (type === 'Star' && s.Star >= s.StarCap) break;

            if (total < s.cap) {
                s[type]++;
                s.Iron++;
            }
            else if (total - s[type] > 0) {
                const donor = FUEL_KEYS.find(k => k !== type && k !== 'Star' && s[k] > 0);
                if (!donor) break;
                s[donor]--;
                s[type]++;
            }
            else break;
        }
        notifyStateChange();
    }, [s]);

    /**
     * Remove a smelter from a fuel.
     *
     * Unfuelling can leave more smelters assigned to outputs than there are
     * running, so the excess is taken off an output too — iron first.
     */
    const onSubFuel = useCallback((type: string) => {
        for (let i = 0; i < keyMultiplier(); i++) {
            if (s[type] <= 0) break;
            s[type]--;
            // A forge's inferno smelters fall back to its own fuel, not to idle.
            if (global.race['forge'] && type === 'Inferno') s.Oil++;

            if (sum(METAL_KEYS) > sum(FUEL_KEYS)) {
                const donor = METAL_KEYS.find(k => s[k] > 0);
                if (donor) s[donor]--;
            }
        }
        notifyStateChange();
    }, [s]);

    /** Point a smelter at an output, taking up slack or stealing from another. */
    const onAddMetal = useCallback((metal: string) => {
        for (let i = 0; i < keyMultiplier(); i++) {
            if (sum(METAL_KEYS) < sum(FUEL_KEYS)) {
                s[metal]++;
            }
            else {
                const donor = METAL_KEYS.find(k => k !== metal && s[k] > 0);
                if (!donor) break;
                s[donor]--;
                s[metal]++;
            }
        }
        notifyStateChange();
    }, [s]);

    /** Take smelters off an output. They go idle rather than to another. */
    const onSubMetal = useCallback((metal: string) => {
        s[metal] = Math.max(0, s[metal] - keyMultiplier());
        notifyStateChange();
    }, [s]);

    /**
     * The seasonal substitution the spook filter made.
     *
     * Only on the Industry tab, and only when the allocation happens to read
     * as a particular set of sixes.
     */
    function fuelValueHtml(key: string): string {
        const value = s[key] ?? 0;
        if (ctx.isModal) return String(value);

        if (key === 'Coal') {
            const sixes = ((global.race['kindling_kindred'] || global.race['smoldering'])
                ? (s.Steel === 6 || s.Iron === 6)
                : s.Wood === 6) && s.Coal === 6 && s.Oil === 6;
            if (sixes) {
                const trick = engine.trickOrTreat(3, 12, true);
                if (trick.length > 0) return trick;
            }
        }
        if (key === 'Oil' && global.race['forge'] && s.Steel === 6 && s.Iron === 6) {
            const trick = engine.trickOrTreat(3, 12, true);
            if (trick.length > 0) return trick;
        }
        return String(value);
    }

    function fuelOption(
        key: string, className: string, label: string, tip: string, interactive: boolean,
        ariaName = label,
    ): AllocationOption {
        return {
            key, className, label,
            valueHtml: fuelValueHtml(key),
            ariaLabel: `${engine.tooltip(tip)} ${s[key]} ${ariaName} fueled.`,
            interactive,
            subLabel: `Remove ${ariaName} fuel`,
            addLabel: `Add ${ariaName} fuel`,
            description: engine.tooltip(tip),
            popId: `${ctx.isModal ? 'mSmelterFuels' : 'smelterFuels'}${tip}`,
        };
    }

    function fuels(): AllocationOption[] {
        const out: AllocationOption[] = [];
        const forge = !!global.race['forge'];

        if (!forge) {
            // Races that cannot burn wood do not get the row, unless evil.
            const burnsWood = (!global.race['kindling_kindred'] && !global.race['smoldering'])
                || global.race['evil'];
            if (burnsWood) {
                // The burnable is not always lumber: some races feed it food or furs.
                const lumberType = global.resource.Lumber.display ? 'Lumber' : 'Lumber';
                out.push(fuelOption('Wood', 'wood', global.resource[lumberType].name, 'wood', true));
            }
            if (global.resource.Coal.display) {
                out.push(fuelOption('Coal', 'coal', global.resource.Coal.name, 'coal', true));
            }
        }

        if (forge) {
            // The forge burns itself: a readout, not a control.
            out.push(fuelOption('Oil', 'oil infoOnly', loc('trait_forge_name'), 'oil', false, 'Oil'));
        }
        else if (global.resource.Oil.display) {
            out.push(fuelOption('Oil', 'oil', global.resource.Oil.name, 'oil', true));
        }

        if (global.tech['star_forge'] && global.tech.star_forge >= 2) {
            out.push(fuelOption('Star', 'star infoOnly', loc('star'), 'star', false));
        }
        if (global.tech['smelting'] && global.tech.smelting >= 8) {
            out.push(fuelOption('Inferno', 'inferno', loc('modal_smelter_inferno'), 'inferno', true, 'inferno'));
        }
        return out;
    }

    function metalOption(key: string, className: string, label: string): AllocationOption {
        return {
            key, className, label,
            valueHtml: String(s[key] ?? 0),
            ariaLabel: `${engine.matText(className)}. ${s[key]} producing ${key}.`,
            interactive: true,
            subLabel: `Smelt less ${className}`,
            addLabel: `Smelt more ${className}`,
            description: engine.matText(className),
            popId: `${ctx.isModal ? 'mSmelterMats' : 'smelterMats'}${className}`,
        };
    }

    const iridSmelt = !!(global.tech['irid_smelting']
        || (global.tech['m_smelting'] && global.tech.m_smelting >= 2));
    const showSteel = !!(global.resource.Steel.display
        && global.tech.smelting >= 2 && !global.race['steelen']);
    const showIridium = !!(global.resource.Iridium.display && iridSmelt);

    function materials(): AllocationOption[] {
        const out = [metalOption('Iron', 'iron', global.resource.Iron.name)];
        if (showSteel) out.push(metalOption('Steel', 'steel', global.resource.Steel.name));
        if (showIridium) out.push(metalOption('Iridium', 'iridium', global.resource.Iridium.name));
        return out;
    }

    const fuelOn = sum(FUEL_KEYS);
    const egg = ctx.isModal ? engine.easterEgg(10) : '';

    return {
        data: {
            fuelLabel: loc('modal_smelter_fuel'),
            fuelLevelClass: engine.colorRange(fuelOn, s.count),
            fuelOn,
            fuelCap: s.cap,
            eggHtml: egg && egg.length > 0 ? egg : null,
            fuelsId: ctx.isModal ? 'mSmelterFuels' : 'smelterFuels',
            fuels: fuels(),

            showMaterials: showIridium || showSteel,
            materialsId: ctx.isModal ? 'mSmelterMats' : 'smelterMats',
            materialLabel: loc('modal_smelter_type'),
            materialLevelClass: engine.colorRange(fuelOn, s.count),
            materialOn: sum(METAL_KEYS),
            materialCap: fuelOn,
            materials: materials(),
        },
        callbacks: { onAddFuel, onSubFuel, onAddMetal, onSubMetal },
    };
}
