/**
 * A market row — one per tradeable resource, in Resources > Market.
 *
 * Ported from marketItem() in resources.ts. Like the structure button, it is
 * one renderer instantiated many times: twenty rows in a mid-game save.
 *
 * It is also the first port to remove Buefy rather than only Vue. The route
 * steppers were wrapped in <b-tooltip>, which rendered a tooltip-content node
 * beside every stepper; they use the React popover instead, which is the same
 * description in a quarter of the DOM.
 *
 * Prices and route counts arrive pre-formatted. Both are the product of a
 * long chain of traits, government perks and astrology, and that arithmetic
 * stays in the engine where the rest of the economy can see it.
 */

import { usePopover } from './Popover';

export interface MarketRowData {
    /** The resource's display name. Absent on the compact row. */
    name: string | null;
    /** Trading is unavailable to some races entirely. */
    showTrade: boolean;
    buyLabel: string;
    sellLabel: string;
    /** Prices, already formatted as currency. */
    buyPrice: string;
    sellPrice: string;

    /** Trade routes are a later unlock than the spot market. */
    showRoutes: boolean;
    /** The market can be inactive, which hides the routes without removing them. */
    routesActive: boolean;
    routesLabel: string;
    /** Route count with its sign, as markup: a trick can replace it. */
    tradeHtml: string;
    /** Colour class: success importing, danger exporting, warning idle. */
    tradeClass: string;
    exportAria: string;
    importAria: string;
    /** Rate descriptions, shown on hover. */
    sellDescription: string;
    buyDescription: string;
    cancelLabel: string;
    /** Popover id prefix, keeping each row's descriptions distinct. */
    popPrefix: string;
}

export interface MarketRowCallbacks {
    onPurchase: () => void;
    onSell: () => void;
    onAutoBuy: () => void;
    onAutoSell: () => void;
    onZero: () => void;
}

/** A route stepper with its rate description. Replaces a <b-tooltip>. */
function RouteStepper({ className, aria, description, popId, glyph, onClick }: {
    className: string;
    aria: string;
    description: string;
    popId: string;
    glyph: string;
    onClick: () => void;
}) {
    const { triggerProps, popover } = usePopover(
        () => <span>{description}</span>,
        { id: popId, wide: true },
    );

    return (
        <>
            <span role="button" aria-label={aria} className={className} onClick={onClick} {...triggerProps}>
                <span>{glyph}</span>
            </span>
            {popover}
        </>
    );
}

export function MarketRow({ data, callbacks }: {
    data: MarketRowData;
    callbacks: MarketRowCallbacks;
}) {
    return (
        <>
            {data.name !== null && <h3 className="res has-text-info">{data.name}</h3>}

            {data.showTrade && (
                <>
                    <span className="buy"><span className="has-text-success">{data.buyLabel}</span></span>
                    <span role="button" className="order" onClick={callbacks.onPurchase}>{data.buyPrice}</span>
                    <span className="sell"><span className="has-text-danger">{data.sellLabel}</span></span>
                    <span role="button" className="order" onClick={callbacks.onSell}>{data.sellPrice}</span>
                </>
            )}

            {data.showRoutes && (
                <span className="trade" hidden={!data.routesActive}>
                    <span className="has-text-warning">{data.routesLabel}</span>
                    <RouteStepper
                        className="sub has-text-danger"
                        aria={data.exportAria}
                        description={data.sellDescription}
                        popId={`${data.popPrefix}Export`}
                        glyph="-"
                        onClick={callbacks.onAutoSell}
                    />
                    <span
                        className={`current ${data.tradeClass}`}
                        dangerouslySetInnerHTML={{ __html: data.tradeHtml }}
                    />
                    <RouteStepper
                        className="add has-text-success"
                        aria={data.importAria}
                        description={data.buyDescription}
                        popId={`${data.popPrefix}Import`}
                        glyph="+"
                        onClick={callbacks.onAutoBuy}
                    />
                    <span role="button" className="zero has-text-advanced" onClick={callbacks.onZero}>
                        {data.cancelLabel}
                    </span>
                </span>
            )}
        </>
    );
}
