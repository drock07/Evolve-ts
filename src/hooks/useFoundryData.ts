/**
 * Bridges engine state to the foundry panel.
 *
 * Which craftables appear, and how each row is labelled, is a translation of
 * the list-building in loadFoundry plus its `level`, `maxScar` and
 * `maxQuantium` helpers.
 */

import { useCallback } from 'react';
import { global } from '../vars';
import { loc } from '../locale';
import { eventActive } from '../functions';
import { useGameTick } from './useGameState';
import { legacy } from './legacyBridge';
import { notifyStateChange } from '../state';
import { FoundryData, FoundryCallbacks, CrafterRowData } from '../components/FoundryPanel';

/** Base craftables, in the order loadFoundry lists them. */
const CRAFTABLES = ['Plywood', 'Brick', 'Wrought_Iron', 'Sheet_Metal', 'Mythril', 'Aerogel', 'Nanoweave'];

/** Shared with the job list: how full something is, as a colour class. */
function fillClass(workers: number, max: number): string {
    if (workers === 0) return 'count has-text-danger';
    if (workers === max) return 'count has-text-success';
    if (workers <= max / 3) return 'count has-text-caution';
    if (workers <= max * 0.66) return 'count has-text-warning';
    if (workers < max) return 'count has-text-info';
    return 'count';
}

export function useFoundryData(servants = false): { data: FoundryData; callbacks: FoundryCallbacks } {
    useGameTick();

    const summer = !!eventActive('summer');

    const list = [...CRAFTABLES];
    if (!servants) {
        list.push('Scarletite', 'Quantium');
        // Thermite is a summer-event craftable and shows even while locked.
        if (summer) list.push('Thermite');
    }

    const rows: CrafterRowData[] = [];
    for (const res of list) {
        const resource = global.resource[res];
        if (!resource) continue;
        if (!(resource.display || (summer && res === 'Thermite'))) continue;

        // The two capped craftables show "assigned / cap" instead of a count.
        const capped =
            (res === 'Scarletite' && Object.prototype.hasOwnProperty.call(global.portal, 'hell_forge')) ||
            (res === 'Quantium' && (
                Object.prototype.hasOwnProperty.call(global.space, 'zero_g_lab') ||
                Object.prototype.hasOwnProperty.call(global.tauceti, 'infectious_disease_lab')
            ));

        const assigned = servants
            ? (global.race.servants?.sjobs?.[res] ?? 0)
            : (global.city.foundry?.[res] ?? 0);

        rows.push({
            res,
            id: servants ? `scraft${res}` : `craft${res}`,
            name: resource.name,
            count: capped && !servants
                ? `${assigned} / ${legacy.crafterCap?.(res) ?? 0}`
                : String(assigned),
            addLabel: `add ${resource.name} crafter`,
            removeLabel: `remove ${resource.name} crafter`,
        });
    }

    const workers = servants ? global.race.servants?.sused ?? 0 : global.city.foundry?.crafting ?? 0;
    const max = servants ? global.race.servants?.smax ?? 0 : global.civic.craftsman?.max ?? 0;

    // The panel only exists once there is somewhere to craft — a foundry, or
    // one of the scenarios that grants crafting without one.
    const display = servants
        ? !!global.race['servants']
        : !!(
            (global.city['foundry'] && global.city.foundry.count > 0) ||
            global.race['cataclysm'] || global.race['orbit_decayed'] ||
            global.tech['isolation'] || global.race['warlord']
        );

    const onAdd = useCallback((res: string) => {
        legacy.adjustCrafter?.(res, 'add', servants);
        notifyStateChange();
    }, [servants]);

    const onRemove = useCallback((res: string) => {
        legacy.adjustCrafter?.(res, 'sub', servants);
        notifyStateChange();
    }, [servants]);

    return {
        data: {
            display,
            title: loc(servants ? 'civics_skilled_servants' : 'craftsman_assigned'),
            assigned: `${workers} / ${max}`,
            assignedClass: fillClass(workers, max),
            rows,
        },
        callbacks: { onAdd, onRemove },
    };
}
