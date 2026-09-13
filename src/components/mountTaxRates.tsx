/**
 * Mounts the TaxRates island into the container civics.ts builds.
 *
 * Kept separate from the component so that civics.ts — which is still legacy
 * and imported by much of the engine — pulls in one small module rather than
 * the React tree directly. That keeps the import graph shallow while the port
 * is in progress.
 */

import { createElement } from 'react';
import { mountIsland } from '../engine/islands';
import { TaxRates } from './TaxRates';
import { useTaxRateData } from '../hooks/useTaxRateData';

/**
 * Wrapper so the hook runs inside a component. The island re-renders on every
 * game tick via useGameTick, the same way the other React panels do.
 */
function TaxRatesIsland() {
    const { data, callbacks } = useTaxRateData();
    return createElement(TaxRates, { data, callbacks });
}

export function mountTaxRates(): boolean {
    return mountIsland(
        document.getElementById('tax_rates'),
        createElement(TaxRatesIsland),
    );
}
