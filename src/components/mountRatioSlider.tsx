/**
 * Mounts one or more ratio panels into the container industry.ts builds.
 *
 * Several panels stack these — the mining ship sorts three grades of ore, the
 * titan mine splits one pair — so the mount takes a list. Each slider is its
 * own component so the hook is called once per slider rather than in a loop.
 */

import { createElement } from 'react';
import { mountIsland } from '../engine/islands';
import { RatioSlider } from './RatioSlider';
import { useRatioSlider, type RatioSliderContext } from '../hooks/useRatioSlider';

function OneSlider({ ctx }: { ctx: RatioSliderContext }) {
    const { data, callbacks } = useRatioSlider(ctx);
    return createElement(RatioSlider, { data, callbacks });
}

function RatioSliderIsland({ items }: { items: RatioSliderContext[] }) {
    return createElement(
        'div',
        null,
        ...items.map((ctx, i) => createElement(OneSlider, { ctx, key: `${ctx.path.join('.')}-${i}` })),
    );
}

export function mountRatioSlider(
    container: Element | null,
    items: RatioSliderContext | RatioSliderContext[],
): boolean {
    const list = Array.isArray(items) ? items : [items];
    return mountIsland(container, createElement(RatioSliderIsland, { items: list }));
}
