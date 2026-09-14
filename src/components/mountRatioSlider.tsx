/**
 * Mounts a ratio panel into the container industry.ts builds.
 */

import { createElement } from 'react';
import { mountIsland } from '../engine/islands';
import { RatioSlider } from './RatioSlider';
import { useRatioSlider, type RatioSliderContext } from '../hooks/useRatioSlider';

function RatioSliderIsland({ ctx }: { ctx: RatioSliderContext }) {
    const { data, callbacks } = useRatioSlider(ctx);
    return createElement(RatioSlider, { data, callbacks });
}

export function mountRatioSlider(container: Element | null, ctx: RatioSliderContext): boolean {
    return mountIsland(container, createElement(RatioSliderIsland, { ctx }));
}
