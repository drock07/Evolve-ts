/**
 * Bridges engine state to a storage row.
 *
 * Assigning is left entirely to the engine: it moves a crate out of the pool
 * and raises the resource's cap by the crate's current worth, and that worth
 * changes with tech. Reimplementing it here would be a second, drifting copy
 * of the storage rules.
 */

import { useCallback } from 'react';
import { global } from '../vars';
import { useGameTick } from './useGameState';
import { notifyStateChange } from '../state';
import { StorageRowData, StorageRowCallbacks, StorageGroup } from '../components/StorageRow';

export interface StorageEngine {
    assignCrate: () => void;
    unassignCrate: () => void;
    assignContainer: () => void;
    unassignContainer: () => void;
    /** Assigned counts, as markup — both carry seasonal substitutions. */
    crateHtml: () => string;
    containerHtml: () => string;
}

export interface StorageContext {
    res: string;
    color: string;
    engine: StorageEngine;
}

export function useStorageData(ctx: StorageContext): {
    data: StorageRowData;
    callbacks: StorageRowCallbacks;
} {
    useGameTick();

    const { engine } = ctx;

    const onAdd = useCallback((kind: string) => {
        if (kind === 'crate') engine.assignCrate();
        else engine.assignContainer();
        notifyStateChange();
    }, [engine]);

    const onSub = useCallback((kind: string) => {
        if (kind === 'crate') engine.unassignCrate();
        else engine.unassignContainer();
        notifyStateChange();
    }, [engine]);

    const resName = global.resource[ctx.res]?.name ?? ctx.res;

    /** Only the kinds of storage this run has unlocked get a group. */
    function groups(): StorageGroup[] {
        const out: StorageGroup[] = [];
        if (global.resource.Crates.display) {
            const label = global.resource.Crates.name;
            out.push({
                kind: 'crate', label,
                valueHtml: engine.crateHtml(),
                subLabel: `remove ${resName} ${label}`,
                addLabel: `add ${resName} ${label}`,
            });
        }
        if (global.resource.Containers.display) {
            const label = global.resource.Containers.name;
            out.push({
                kind: 'container', label,
                valueHtml: engine.containerHtml(),
                subLabel: `remove ${resName} ${label}`,
                addLabel: `add ${resName} ${label}`,
            });
        }
        return out;
    }

    return {
        data: { name: resName, color: ctx.color, groups: groups() },
        callbacks: { onAdd, onSub },
    };
}
