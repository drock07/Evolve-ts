/**
 * Temporary bridge hook that reads legacy global state and produces
 * props for the EvolutionTab component.
 *
 * This will be replaced once evolution is managed by the new engine.
 */

import { useGameTick } from './useGameState';
import { global } from '../vars';
import { legacy } from './legacyBridge';
import { EvolutionActionData, EvolutionActionCallbacks } from '../components/EvolutionTab';

interface EvolutionItem {
    action: EvolutionActionData;
    callbacks: EvolutionActionCallbacks;
}

export function useEvolutionData(): EvolutionItem[] {
    useGameTick();

    if (!legacy.actions?.evolution) return [];
    if (global.race.universe === 'bigbang') return [];
    if (global.race.seeded && !global.race['chose']) return [];

    const items: EvolutionItem[] = [];

    Object.keys(legacy.actions.evolution).forEach(evo => {
        const c_action = legacy.actions.evolution[evo];

        // Skip challenge actions
        if (c_action.challenge) return;

        // Check condition
        if (c_action.condition && !c_action.condition()) return;

        // Check tech requirements
        if (c_action.reqs) {
            for (const req of Object.keys(c_action.reqs)) {
                if (!global.tech[req] || global.tech[req] < c_action.reqs[req]) {
                    return;
                }
            }
        }

        // Build cost list
        const costs = [];
        if (c_action.cost) {
            for (const res of Object.keys(c_action.cost)) {
                const amount = c_action.cost[res]();
                if (amount > 0) {
                    const available = global.resource[res]?.amount ?? 0;
                    costs.push({
                        label: global.resource[res]?.name || res.replace(/_/g, ' '),
                        amount,
                        affordable: available >= amount,
                    });
                }
            }
        }

        const title = typeof c_action.title === 'function' ? c_action.title() : c_action.title;
        const desc = typeof c_action.desc === 'function' ? c_action.desc() : (c_action.desc || '');
        const effect = typeof c_action.effect === 'function' ? c_action.effect() : (c_action.effect || undefined);

        const count = c_action.count
            ? c_action.count()
            : (global.evolution[evo] && global.evolution[evo].count >= 0
                ? global.evolution[evo].count
                : undefined);

        const canAfford = legacy.checkAffordable(c_action);
        const canAffordSome = legacy.checkAffordable(c_action, true);

        items.push({
            action: {
                id: c_action.id,
                title,
                desc,
                effect,
                count,
                costs,
                canAfford,
                canAffordSome,
            },
            callbacks: {
                onClick: () => {
                    if (c_action.action) {
                        c_action.action({});
                    }
                },
            },
        });
    });

    return items;
}
