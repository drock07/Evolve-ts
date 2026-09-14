/**
 * Mounts the garrison into the containers civics.ts builds.
 *
 * Two of them: #garrison under Civics > Military and #c_garrison under
 * Civics > Government. They are separate islands over one component, so the
 * `full` distinction stays a prop rather than becoming two implementations.
 */

import { createElement, useEffect } from 'react';
import { mountIsland } from '../engine/islands';
import { Garrison } from './Garrison';
import { useGarrisonData } from '../hooks/useGarrisonData';
import { legacy } from '../hooks/legacyBridge';

function GarrisonIsland({ full }: { full: boolean }) {
    const { data, callbacks } = useGarrisonData(full);

    // Both containers carried v-show in the legacy markup, so the island keeps
    // their visibility in step — the same arrangement as the MAD panel.
    useEffect(() => {
        const el = document.getElementById(full ? 'garrison' : 'c_garrison');
        if (el) el.style.display = data.display ? '' : 'none';
    }, [data.display, full]);

    // The popovers bind to elements by selector at call time, so they can only
    // be attached once this has rendered.
    useEffect(() => {
        legacy.registerGarrisonPopovers?.(full);
    }, [full]);

    return createElement(Garrison, { data, callbacks, full });
}

export function mountGarrison(full: boolean): boolean {
    return mountIsland(
        document.getElementById(full ? 'garrison' : 'c_garrison'),
        createElement(GarrisonIsland, { full }),
    );
}
