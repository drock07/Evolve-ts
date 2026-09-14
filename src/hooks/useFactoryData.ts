/**
 * Bridges engine state to the factory panel.
 *
 * The available-factory count is the interesting part: factories are not only
 * the city's. Mars, interstellar, tau ceti and the portal each contribute, at
 * their own multipliers, and the legacy recomputed that sum in three separate
 * places — the add handler, the level colour and the header. It is computed
 * once here.
 */

import { useCallback } from 'react';
import { global, keyMultiplier } from '../vars';
import { loc } from '../locale';
import { useGameTick } from './useGameState';
import { notifyStateChange } from '../state';
import { FactoryData, FactoryCallbacks, FactoryProduct } from '../components/FactoryPanel';

export interface FactoryEngine {
    /** Describes what a product consumes. */
    tooltip: (type: string) => string;
    colorRange: (num: number, max: number) => string;
    trickOrTreat: (num: number, day: number, header: boolean) => string;
    /** Total factory lines available, across every region that has them. */
    maxFactories: () => number;
}

export interface FactoryContext {
    isModal: boolean;
    engine: FactoryEngine;
}

/** Every product a factory can be pointed at, in the order they are listed. */
const PRODUCTS = ['Lux', 'Furs', 'Alloy', 'Polymer', 'Nano', 'Stanene'] as const;

const assignedTotal = () =>
    PRODUCTS.reduce((n, k) => n + (global.city.factory?.[k] ?? 0), 0);

export function useFactoryData(ctx: FactoryContext): {
    data: FactoryData;
    callbacks: FactoryCallbacks;
} {
    useGameTick();

    const f = global.city.factory;
    const { engine } = ctx;

    const onSub = useCallback((item: string) => {
        for (let i = 0; i < keyMultiplier(); i++) {
            if (f[item] <= 0) break;
            f[item]--;
        }
        notifyStateChange();
    }, [f]);

    /**
     * Assign a factory to a product.
     *
     * Takes a free line if there is one, and otherwise takes it from alloy —
     * only alloy, unlike the smelter, which walks a list of donors.
     */
    const onAdd = useCallback((item: string) => {
        const max = engine.maxFactories();
        for (let i = 0; i < keyMultiplier(); i++) {
            const used = assignedTotal();
            if (used < max) {
                f[item]++;
            }
            else if (used === max && item !== 'Alloy' && f['Alloy'] > 0) {
                f['Alloy']--;
                f[item]++;
            }
            else break;
        }
        notifyStateChange();
    }, [f, engine]);

    /** Which products are unlocked, and what each is called. */
    function products(): FactoryProduct[] {
        const out: FactoryProduct[] = [];
        const id = ctx.isModal ? 'specialModal' : 'iFactory';

        const add = (key: string, label: string, ariaName = key) => {
            // Luxury goods alone carry a seasonal substitution, and only on the
            // Industry tab.
            let valueHtml = String(f[key] ?? 0);
            if (key === 'Lux' && !ctx.isModal && f.Lux === 3) {
                const trick = engine.trickOrTreat(6, 12, true);
                if (trick.length > 0) valueHtml = trick;
            }
            out.push({
                key, label, valueHtml,
                ariaLabel: `${engine.tooltip(key)}. ${f[key]} factories producing ${key}.`,
                description: engine.tooltip(key),
                popId: `${id}${key}`,
                subLabel: `Decrease ${ariaName} production`,
                addLabel: `Increase ${ariaName} production`,
            });
        };

        add('Lux', loc('modal_factory_lux'));
        if (global.tech['synthetic_fur']) {
            add('Furs', global.race['evil'] ? loc('resource_Flesh_name') : global.resource.Furs.name);
        }
        add('Alloy', global.resource.Alloy.name);
        if (global.tech['polymer']) add('Polymer', global.resource.Polymer.name);
        // The accessible label says "Nanotube" where the engine key says "Nano".
        if (global.tech['nano']) add('Nano', global.resource.Nano_Tube.name, 'Nanotube');
        if (global.tech['stanene']) add('Stanene', global.resource.Stanene.name);
        return out;
    }

    const assigned = assignedTotal();
    const max = engine.maxFactories();

    return {
        data: {
            operatingLabel: loc('modal_factory_operate'),
            levelClass: engine.colorRange(assigned, max),
            assigned,
            max,
            products: products(),
        },
        callbacks: { onAdd, onSub },
    };
}
