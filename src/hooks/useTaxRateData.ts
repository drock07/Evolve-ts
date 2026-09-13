/**
 * Bridges the legacy engine state to the TaxRates component.
 *
 * Follows the same shape as the other hooks here: read `global` on every game
 * tick, and hand the component plain data plus callbacks. The engine remains
 * the single source of truth — this does not hold a copy.
 */

import { useCallback } from 'react';
import { global } from '../vars';
import { loc } from '../locale';
import { easterEgg, trickOrTreat } from '../functions';
import { useGameTick } from './useGameState';
import { notifyStateChange } from '../state';
import { legacy } from './legacyBridge';
import { TaxRatesData, TaxRatesCallbacks } from '../components/TaxRates';

/**
 * Reproduces the Vue `tax_level` filter: normally the rate as a percentage,
 * but an easter egg replaces it at whichever end of the range is unusual for
 * the species, and a Halloween treat at exactly 13%.
 */
function formatRate(rate: number): { label: string; labelIsMarkup: boolean } {
    const egg = easterEgg(11, 14);
    const trick = trickOrTreat(2, 14, false);

    const atEggRate = global.race['noble'] ? rate === 10 : rate === 0;
    if (egg.length > 0 && atEggRate) {
        return { label: egg, labelIsMarkup: true };
    }
    if (rate === 13 && trick.length > 0) {
        return { label: trick, labelIsMarkup: true };
    }
    return { label: `${rate}%`, labelIsMarkup: false };
}

export function useTaxRateData(): { data: TaxRatesData; callbacks: TaxRatesCallbacks } {
    useGameTick();

    const taxes = global.civic.taxes;
    const rate = taxes?.tax_rate ?? 0;

    /**
     * Engine mutations driven from the UI have to announce themselves.
     *
     * The Vue original bound straight to global.civic.taxes, so Vue's own
     * reactivity repainted the moment the value changed. A React island only
     * re-renders when the tick notifier fires, which would leave a click
     * looking unresponsive until the next loop — up to 250ms, and forever if
     * the loop is paused. Notifying here restores the immediate feedback.
     *
     * Every ported control that writes to `global` needs to do this.
     */
    const onIncrease = useCallback(() => {
        legacy.adjustTax?.('add');
        notifyStateChange();
    }, []);

    const onDecrease = useCallback(() => {
        legacy.adjustTax?.('sub');
        notifyStateChange();
    }, []);

    return {
        data: {
            display: !!taxes?.display,
            title: loc('civics_tax_rates'),
            rate,
            ...formatRate(rate),
        },
        callbacks: { onIncrease, onDecrease },
    };
}
