/**
 * Tax rate control — the «/» stepper in the Civics > Government tab.
 *
 * Ported from the Vue instance that used to bind to #tax_rates. Rendered as an
 * island inside the container civics.ts still builds (see engine/islands.ts).
 */

import { usePopover } from './Popover';

export interface TaxRatesData {
    /** Whether the control is shown at all; false before a government exists. */
    display: boolean;
    /** Localised heading, from loc('civics_tax_rates'). */
    title: string;
    /** Rate as the engine holds it, used for the aria value. */
    rate: number;
    /**
     * What to show in the middle. Usually `${rate}%`, but the engine swaps in
     * an easter egg at the extremes during certain events, so it arrives as
     * pre-rendered markup rather than a number.
     */
    label: string;
    /** True when `label` is engine-supplied markup rather than plain text. */
    labelIsMarkup: boolean;
    /** Hover description for the heading. */
    description: string;
}

export interface TaxRatesCallbacks {
    onIncrease: () => void;
    onDecrease: () => void;
}

export function TaxRates({ data, callbacks }: { data: TaxRatesData; callbacks: TaxRatesCallbacks }) {
    // Before the early return: hooks cannot run conditionally.
    const { triggerProps, popover } = usePopover(
        () => <span>{data.description}</span>,
        { id: 'taxRateLabel', classes: 'has-background-light has-text-dark' },
    );

    if (!data.display) return null;

    return (
        <>
            <h3 id="taxRateLabel" {...triggerProps}>{data.title}</h3>
            {popover}
            <span
                role="button"
                aria-label="decrease taxes"
                className="sub has-text-success"
                onClick={callbacks.onDecrease}
            >
                &laquo;
            </span>
            {data.labelIsMarkup
                ? <span className="current" dangerouslySetInnerHTML={{ __html: data.label }} />
                : <span className="current">{data.label}</span>}
            <span
                role="button"
                aria-label="increase taxes"
                className="add has-text-danger"
                onClick={callbacks.onIncrease}
            >
                &raquo;
            </span>
        </>
    );
}
