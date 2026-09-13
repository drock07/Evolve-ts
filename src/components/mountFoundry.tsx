/**
 * Mounts the foundry panel into the container loadFoundry() builds.
 */

import { createElement } from 'react';
import { mountIsland } from '../engine/islands';
import { FoundryPanel } from './FoundryPanel';
import { useFoundryData } from '../hooks/useFoundryData';

function FoundryIsland({ servants }: { servants: boolean }) {
    const { data, callbacks } = useFoundryData(servants);
    return createElement(FoundryPanel, { data, callbacks });
}

export function mountFoundry(servants = false): boolean {
    return mountIsland(
        document.getElementById(servants ? 'skilledServants' : 'foundry'),
        createElement(FoundryIsland, { servants }),
    );
}
