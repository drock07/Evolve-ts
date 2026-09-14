/**
 * Bridges engine state to the mining droid.
 *
 * Its rule at capacity is that there isn't one: a droid can only be assigned
 * while one is idle, and nothing is ever taken off another ore. That makes it
 * the simplest of the four allocation policies in the game, and the reason
 * ProductRow carries none of them.
 */

import { useCallback } from 'react';
import { global, keyMultiplier } from '../vars';
import { loc } from '../locale';
import { useGameTick } from './useGameState';
import { notifyStateChange } from '../state';
import { DroidData, DroidCallbacks } from '../components/DroidPanel';
import type { ProductOption } from '../components/ProductRow';

export interface DroidEngine {
    tooltip: (type: string) => string;
    colorRange: (num: number, max: number) => string;
}

export interface DroidContext {
    isModal: boolean;
    engine: DroidEngine;
}

/** Ore keys, with the resource each maps to and its display name source. */
const ORES: Array<{ key: string; resource: string; aria: string }> = [
    { key: 'adam', resource: 'Adamantite', aria: 'Adamantite' },
    { key: 'uran', resource: 'Uranium', aria: 'Uranium' },
    { key: 'coal', resource: 'Coal', aria: 'Coal' },
    { key: 'alum', resource: 'Aluminium', aria: 'Aluminium' },
];

const assignedTotal = () =>
    ORES.reduce((n, o) => n + (global.interstellar.mining_droid?.[o.key] ?? 0), 0);

export function useDroidData(ctx: DroidContext): {
    data: DroidData;
    callbacks: DroidCallbacks;
} {
    useGameTick();

    const d = global.interstellar?.mining_droid;
    const { engine } = ctx;

    const onAdd = useCallback((item: string) => {
        const rec = global.interstellar?.mining_droid;
        if (!rec) return;
        for (let i = 0; i < keyMultiplier(); i++) {
            // Only an idle droid can be assigned; nothing is displaced.
            if (assignedTotal() >= rec.on) break;
            rec[item]++;
        }
        notifyStateChange();
    }, []);

    const onSub = useCallback((item: string) => {
        const rec = global.interstellar?.mining_droid;
        if (!rec) return;
        for (let i = 0; i < keyMultiplier(); i++) {
            if (rec[item] <= 0) break;
            rec[item]--;
        }
        notifyStateChange();
    }, []);

    const assigned = assignedTotal();
    const id = ctx.isModal ? 'specialModal' : 'iDroid';

    return {
        data: {
            operatingLabel: loc('modal_factory_operate'),
            levelClass: engine.colorRange(assigned, d?.on ?? 0),
            assigned,
            running: d?.on ?? 0,
            ores: ORES.map(ore => ({
                key: ore.key,
                label: global.resource[ore.resource].name,
                valueHtml: String(d?.[ore.key] ?? 0),
                ariaLabel: `${engine.tooltip(ore.key)}. ${d?.[ore.key] ?? 0} producing ${ore.aria}.`,
                description: engine.tooltip(ore.key),
                popId: `${id}${ore.key}`,
                subLabel: `Decrease ${ore.aria} production`,
                addLabel: `Increase ${ore.aria} production`,
            })),
        },
        callbacks: { onAdd, onSub },
    };
}
