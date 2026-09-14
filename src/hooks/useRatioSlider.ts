/**
 * Drives a ratio panel: read one field of one record, clamp it to 0-100.
 *
 * The stepping honours keyMultiplier, as every stepped control in the game
 * does; dragging the slider sets a value outright and skips it.
 */

import { useCallback } from 'react';
import { global, keyMultiplier } from '../vars';
import { useGameTick } from './useGameState';
import { notifyStateChange } from '../state';
import { RatioSliderData, RatioSliderCallbacks } from '../components/RatioSlider';

export interface RatioSliderContext {
    /** Where the ratio lives, e.g. ['space', 'titan_mine', 'ratio']. */
    path: [string, string, string];
    description: string;
    subLabel: string;
    addLabel: string;
    sliderLabel: string;
    barClass?: string;
}

const clamp = (n: number) => Math.min(100, Math.max(0, n));

export function useRatioSlider(ctx: RatioSliderContext): {
    data: RatioSliderData;
    callbacks: RatioSliderCallbacks;
} {
    useGameTick();

    const [region, key, field] = ctx.path;
    const record = global[region]?.[key];
    const value = record?.[field] ?? 0;

    const set = useCallback((next: number) => {
        const rec = global[region]?.[key];
        if (rec) rec[field] = clamp(next);
        notifyStateChange();
    }, [region, key, field]);

    const onSub = useCallback(() => {
        const rec = global[region]?.[key];
        if (rec) rec[field] = clamp(rec[field] - keyMultiplier());
        notifyStateChange();
    }, [region, key, field]);

    const onAdd = useCallback(() => {
        const rec = global[region]?.[key];
        if (rec) rec[field] = clamp(rec[field] + keyMultiplier());
        notifyStateChange();
    }, [region, key, field]);

    return {
        data: {
            description: ctx.description,
            value,
            subLabel: ctx.subLabel,
            addLabel: ctx.addLabel,
            sliderLabel: ctx.sliderLabel,
            barClass: ctx.barClass,
        },
        callbacks: { onSub, onAdd, onSet: set },
    };
}
