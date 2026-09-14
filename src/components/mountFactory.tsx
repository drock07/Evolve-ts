/**
 * Mounts the factory panel into the container industry.ts builds.
 */

import { createElement } from 'react';
import { mountIsland } from '../engine/islands';
import { FactoryPanel } from './FactoryPanel';
import { useFactoryData, type FactoryContext } from '../hooks/useFactoryData';

function FactoryIsland({ ctx }: { ctx: FactoryContext }) {
    const { data, callbacks } = useFactoryData(ctx);
    return createElement(FactoryPanel, { data, callbacks });
}

export function mountFactory(container: Element | null, ctx: FactoryContext): boolean {
    return mountIsland(container, createElement(FactoryIsland, { ctx }));
}
