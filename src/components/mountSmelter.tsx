/**
 * Mounts the smelter panel into the container industry.ts builds.
 *
 * Two targets, as the garrison had: the options modal reached from the
 * smelter's gear, and the row in the Industry tab. One component serves both.
 */

import { createElement } from 'react';
import { mountIsland } from '../engine/islands';
import { SmelterPanel } from './SmelterPanel';
import { useSmelterData, type SmelterContext } from '../hooks/useSmelterData';

function SmelterIsland({ ctx }: { ctx: SmelterContext }) {
    const { data, callbacks } = useSmelterData(ctx);
    return createElement(SmelterPanel, { data, callbacks });
}

export function mountSmelter(container: Element | null, ctx: SmelterContext): boolean {
    return mountIsland(container, createElement(SmelterIsland, { ctx }));
}
