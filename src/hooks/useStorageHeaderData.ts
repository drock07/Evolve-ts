/**
 * Bridges engine state to the storage construction header.
 *
 * The descriptions are rebuilt on every read rather than cached: a crate's
 * cost and its worth both move with tech, and the label is what tells the
 * player whether building another is worth it.
 */

import { useCallback } from 'react';
import { global } from '../vars';
import { loc } from '../locale';
import { useGameTick } from './useGameState';
import { notifyStateChange } from '../state';
import { StorageHeaderData, StorageHeaderCallbacks } from '../components/StorageHeader';

export interface StorageHeaderEngine {
    buildCrate: () => void;
    buildContainer: () => void;
    crateLabel: () => string;
    containerLabel: () => string;
}

export function useStorageHeaderData(engine: StorageHeaderEngine): {
    data: StorageHeaderData;
    callbacks: StorageHeaderCallbacks;
} {
    useGameTick();

    const onConstruct = useCallback((kind: string) => {
        if (kind === 'crate') engine.buildCrate();
        else engine.buildContainer();
        notifyStateChange();
    }, [engine]);

    return {
        data: {
            title: loc('tab_storage'),
            buttons: [
                {
                    kind: 'crate',
                    className: 'crate',
                    label: loc('resource_modal_crate_construct'),
                    description: engine.crateLabel(),
                    visible: !!global.resource.Crates?.display,
                },
                {
                    kind: 'container',
                    className: 'container',
                    label: loc('resource_modal_container_construct'),
                    description: engine.containerLabel(),
                    visible: !!global.resource.Containers?.display,
                },
            ],
        },
        callbacks: { onConstruct },
    };
}
