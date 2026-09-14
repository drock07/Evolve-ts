/** Mounts the mining droid panel into the container industry.ts builds. */

import { createElement } from 'react';
import { mountIsland } from '../engine/islands';
import { DroidPanel } from './DroidPanel';
import { useDroidData, type DroidContext } from '../hooks/useDroidData';

function DroidIsland({ ctx }: { ctx: DroidContext }) {
    const { data, callbacks } = useDroidData(ctx);
    return createElement(DroidPanel, { data, callbacks });
}

export function mountDroid(container: Element | null, ctx: DroidContext): boolean {
    return mountIsland(container, createElement(DroidIsland, { ctx }));
}
