/**
 * Mounts the government selector into the #govType container civics.ts builds.
 */

import { createElement, useEffect, useState } from 'react';
import { mountIsland } from '../engine/islands';
import { GovernmentSelector } from './GovernmentSelector';
import { useGovernmentData } from '../hooks/useGovernmentData';

function GovernmentIsland() {
    const { data, callbacks } = useGovernmentData();
    const [open, setOpen] = useState(false);

    // The container is legacy-owned and carried v-show="vis()", so the island
    // keeps its visibility in step — same arrangement as the MAD panel.
    useEffect(() => {
        const el = document.getElementById('govType');
        if (el) el.style.display = data.display ? '' : 'none';
    }, [data.display]);

    // Selecting a government closes the modal. Doing it here rather than in
    // the hook keeps the open state owned by the one component that renders it.
    const onSelect = (gov: string) => {
        callbacks.onSelect(gov);
        setOpen(false);
    };

    return createElement(GovernmentSelector, {
        data,
        callbacks: { ...callbacks, onSelect },
        open,
        onOpenChange: setOpen,
    });
}

export function mountGovernment(): boolean {
    return mountIsland(
        document.getElementById('govType'),
        createElement(GovernmentIsland),
    );
}
