/** Mounts the graphene plant into the container industry.ts builds. */

import { createElement } from 'react';
import { mountIsland } from '../engine/islands';
import { GraphenePanel } from './GraphenePanel';
import { useGrapheneData, type GrapheneContext } from '../hooks/useGrapheneData';

function GrapheneIsland({ ctx }: { ctx: GrapheneContext }) {
    const { data, callbacks } = useGrapheneData(ctx);
    return createElement(GraphenePanel, { data, callbacks });
}

export function mountGraphene(container: Element | null, ctx: GrapheneContext): boolean {
    return mountIsland(container, createElement(GrapheneIsland, { ctx }));
}
