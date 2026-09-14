/** Mounts the storage construction header into #createHead. */

import { createElement } from 'react';
import { mountIsland } from '../engine/islands';
import { StorageHeader } from './StorageHeader';
import { useStorageHeaderData, type StorageHeaderEngine } from '../hooks/useStorageHeaderData';

function StorageHeaderIsland({ engine }: { engine: StorageHeaderEngine }) {
    const { data, callbacks } = useStorageHeaderData(engine);
    return createElement(StorageHeader, { data, callbacks });
}

export function mountStorageHeader(container: Element | null, engine: StorageHeaderEngine): boolean {
    return mountIsland(container, createElement(StorageHeaderIsland, { engine }));
}
