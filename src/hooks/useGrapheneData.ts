/**
 * Bridges engine state to the graphene plant.
 *
 * Where the plant lives depends on the run — interstellar normally, space on
 * truepath, the portal for a warlord — so the record's address is part of the
 * context rather than assumed.
 */

import { useCallback } from 'react';
import { global, keyMultiplier } from '../vars';
import { loc } from '../locale';
import { useGameTick } from './useGameState';
import { notifyStateChange } from '../state';
import { GrapheneData, GrapheneCallbacks } from '../components/GraphenePanel';
import type { AllocationOption } from '../components/AllocationRow';

export interface GrapheneEngine {
    tooltip: (type: string) => string;
    colorRange: (num: number, max: number) => string;
}

export interface GrapheneContext {
    /** Region and structure the plant lives in for this run. */
    source: string;
    struct: string;
    isModal: boolean;
    engine: GrapheneEngine;
}

const FUELS = ['Lumber', 'Coal', 'Oil'] as const;

export function useGrapheneData(ctx: GrapheneContext): {
    data: GrapheneData;
    callbacks: GrapheneCallbacks;
} {
    useGameTick();

    const rec = global[ctx.source]?.[ctx.struct];
    const { engine } = ctx;
    const fuelled = FUELS.reduce((n, k) => n + (rec?.[k] ?? 0), 0);

    /**
     * Fuel a plant.
     *
     * Takes a spare plant if one is running unfuelled. Otherwise it displaces
     * the *smaller* of the two rival fuels, falling back to the other when the
     * smaller is empty — which drives the lesser fuel to zero rather than
     * keeping the two level.
     */
    const onAdd = useCallback((fuel: string) => {
        const r = global[ctx.source]?.[ctx.struct];
        if (!r) return;

        for (let i = 0; i < keyMultiplier(); i++) {
            const total = FUELS.reduce((n, k) => n + (r[k] ?? 0), 0);
            if (total < r.on) {
                r[fuel]++;
                continue;
            }
            const rivals = FUELS.filter(k => k !== fuel);
            if (rivals.reduce((n, k) => n + (r[k] ?? 0), 0) <= 0) break;

            const [a, b] = rivals;
            // The smaller of the two gives way; if it is already empty the
            // other does instead.
            const smaller = r[a] > r[b] ? b : a;
            const larger = smaller === a ? b : a;
            if (r[smaller] > 0) r[smaller]--;
            else r[larger]--;
            r[fuel]++;
        }
        notifyStateChange();
    }, [ctx.source, ctx.struct]);

    const onSub = useCallback((fuel: string) => {
        const r = global[ctx.source]?.[ctx.struct];
        if (!r) return;
        for (let i = 0; i < keyMultiplier(); i++) {
            if (r[fuel] <= 0) break;
            r[fuel]--;
        }
        notifyStateChange();
    }, [ctx.source, ctx.struct]);

    function option(key: string, className: string, label: string, tip: string): AllocationOption {
        return {
            key, className, label,
            valueHtml: String(rec?.[key] ?? 0),
            ariaLabel: `${engine.tooltip(tip)} ${rec?.[key] ?? 0} ${key} fueled.`,
            interactive: true,
            subLabel: `Remove ${tip} fuel`,
            addLabel: `Add ${tip} fuel`,
            description: engine.tooltip(tip),
            popId: `${ctx.isModal ? 'mGraphene' : 'iGraphene'}${tip}`,
        };
    }

    function fuels(): AllocationOption[] {
        const out: AllocationOption[] = [];
        // Races that cannot burn wood do not get the row.
        if (!global.race['kindling_kindred'] && !global.race['smoldering']) {
            out.push(option('Lumber', 'wood', global.resource.Lumber.name, 'wood'));
        }
        if (global.resource.Coal.display) {
            out.push(option('Coal', 'coal', global.resource.Coal.name, 'coal'));
        }
        if (global.resource.Oil.display) {
            out.push(option('Oil', 'oil', global.resource.Oil.name, 'oil'));
        }
        return out;
    }

    return {
        data: {
            fuelLabel: loc('modal_smelter_fuel'),
            levelClass: engine.colorRange(fuelled, rec?.on ?? 0),
            fuelled,
            running: rec?.on ?? 0,
            fuels: fuels(),
        },
        callbacks: { onAdd, onSub },
    };
}
