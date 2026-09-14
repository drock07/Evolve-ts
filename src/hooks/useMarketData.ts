/**
 * Bridges engine state to a market row.
 *
 * Deliberately thin. Every number a market row shows is the product of a long
 * chain of traits, government perks, astrology and achievement ranks, and all
 * of that arithmetic stays in resources.ts where the rest of the economy can
 * see it. The engine callables arrive through the context, so this file reads
 * state and formats nothing it does not have to.
 */

import { useCallback } from 'react';
import { global } from '../vars';
import { loc } from '../locale';
import { useGameTick } from './useGameState';
import { notifyStateChange } from '../state';
import { MarketRowData, MarketRowCallbacks } from '../components/MarketRow';

export interface MarketEngine {
    /** Spot prices, already through the trait chain and size-approximated. */
    buyPrice: () => string;
    sellPrice: () => string;
    purchase: () => void;
    sell: () => void;
    autoBuy: () => void;
    autoSell: () => void;
    zero: () => void;
    /** Rate descriptions for the two route steppers. */
    sellDescription: () => string;
    buyDescription: () => string;
    /** Route count with its sign; markup, since a trick can replace it. */
    tradeHtml: () => string;
}

export interface MarketContext {
    /** Resource key, e.g. 'Lumber'. */
    res: string;
    /** The full row carries a heading and route controls; the compact one does not. */
    full: boolean;
    /** Whether this row's trade routes are unlocked at all. */
    showRoutes: boolean;
    engine: MarketEngine;
}

export function useMarketData(ctx: MarketContext): {
    data: MarketRowData;
    callbacks: MarketRowCallbacks;
} {
    useGameTick();

    const { engine, res } = ctx;
    const resource = global.resource[res];

    const wrap = (fn: () => void) => () => { fn(); notifyStateChange(); };

    const onPurchase = useCallback(wrap(engine.purchase), [engine]);
    const onSell = useCallback(wrap(engine.sell), [engine]);
    const onAutoBuy = useCallback(wrap(engine.autoBuy), [engine]);
    const onAutoSell = useCallback(wrap(engine.autoSell), [engine]);
    const onZero = useCallback(wrap(engine.zero), [engine]);

    /**
     * The colour of the route count.
     *
     * Was tradeRouteColor(), which added and removed three classes by jQuery
     * selector after every change. It is a derivation of one number.
     */
    const trade = resource?.trade ?? 0;
    const tradeClass = trade > 0
        ? 'has-text-success'
        : trade < 0 ? 'has-text-danger' : 'has-text-warning';

    return {
        data: {
            // Underscores are spaces in a resource's display name.
            name: ctx.full ? res.replace('_', ' ') : null,
            showTrade: !global.race['no_trade'],
            buyLabel: loc('resource_market_buy'),
            sellLabel: loc('resource_market_sell'),
            buyPrice: `$${engine.buyPrice()}`,
            sellPrice: `$${engine.sellPrice()}`,

            showRoutes: ctx.showRoutes,
            routesActive: !!global.city.market?.active,
            routesLabel: loc('resource_market_routes'),
            tradeHtml: engine.tradeHtml(),
            tradeClass,
            exportAria: `export ${resource?.name ?? res}`,
            importAria: `import ${resource?.name ?? res}`,
            sellDescription: engine.sellDescription(),
            buyDescription: engine.buyDescription(),
            cancelLabel: loc('cancel_routes'),
            popPrefix: `market${res}`,
        },
        callbacks: { onPurchase, onSell, onAutoBuy, onAutoSell, onZero },
    };
}
