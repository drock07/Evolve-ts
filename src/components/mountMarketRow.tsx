/**
 * Mounts a market row into the container resources.ts builds for it.
 */

import { createElement } from 'react';
import { mountIsland } from '../engine/islands';
import { MarketRow } from './MarketRow';
import { useMarketData, type MarketContext } from '../hooks/useMarketData';

function MarketRowIsland({ ctx }: { ctx: MarketContext }) {
    const { data, callbacks } = useMarketData(ctx);
    return createElement(MarketRow, { data, callbacks });
}

export function mountMarketRow(container: Element | null, ctx: MarketContext): boolean {
    return mountIsland(container, createElement(MarketRowIsland, { ctx }));
}
