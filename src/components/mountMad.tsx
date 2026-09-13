/**
 * Mounts the MadControl island into the #mad container civics.ts builds.
 */

import { createElement, useEffect } from 'react';
import { mountIsland } from '../engine/islands';
import { MadControl } from './MadControl';
import { useMadData } from '../hooks/useMadData';

const CONTAINER_ID = 'mad';

function MadIsland() {
    const { data, callbacks } = useMadData();

    /**
     * The container is legacy-owned, but two of its attributes are view state,
     * so the island keeps them in step:
     *
     * - `armed` class: the stylesheet selector is `.armed .mad`, so the class
     *   has to sit on an ancestor of what React renders. It is applied when the
     *   missiles are LIVE, which is when the flag is false.
     * - display: stands in for the original `v-show="display"`.
     */
    useEffect(() => {
        const el = document.getElementById(CONTAINER_ID);
        if (!el) return;
        el.classList.toggle('armed', !data.armed);
        el.style.display = data.display ? '' : 'none';
    }, [data.armed, data.display]);

    return createElement(MadControl, { data, callbacks });
}

export function mountMad(): boolean {
    return mountIsland(
        document.getElementById(CONTAINER_ID),
        createElement(MadIsland),
    );
}
