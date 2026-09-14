/** Mounts a storage row into the container resources.ts builds for it. */

import { createElement } from 'react';
import { mountIsland } from '../engine/islands';
import { StorageRow } from './StorageRow';
import { useStorageData, type StorageContext } from '../hooks/useStorageData';

function StorageRowIsland({ ctx }: { ctx: StorageContext }) {
    const { data, callbacks } = useStorageData(ctx);
    return createElement(StorageRow, { data, callbacks });
}

export function mountStorageRow(container: Element | null, ctx: StorageContext): boolean {
    return mountIsland(container, createElement(StorageRowIsland, { ctx }));
}
