/**
 * Hosts the espionage modal and exposes the opener legacy code calls.
 *
 * Unlike the other islands, this one has no legacy-built container to render
 * into: the Buefy modal it replaces created its own node on demand and threw
 * it away on close. So the host is created here, once, directly under <body>.
 *
 * Under <body> specifically, not inside #foreign where the trigger lives. A
 * <dialog> in the top layer still does not render if an ancestor is display:
 * none, and #foreign carries v-show — so parenting it there would tie the
 * modal's visibility to a container the legacy code hides freely.
 */

import { createElement, useCallback, useSyncExternalStore } from 'react';
import { mountIsland } from '../engine/islands';
import { EspionageModal } from './EspionageModal';
import { useEspionageData } from '../hooks/useEspionageData';

/**
 * Which government the modal is acting on, and whether it is showing.
 *
 * `gov` is kept when the modal closes rather than cleared: the close is what
 * React renders next, and reading a government of `null` mid-close would mean
 * making every consumer handle a state that is never visible.
 */
let state: { gov: number; open: boolean } = { gov: 0, open: false };
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

function getSnapshot() {
    return state;
}

function setState(next: { gov: number; open: boolean }): void {
    state = next;
    listeners.forEach(fn => fn());
}

function EspionageIsland() {
    const { gov, open } = useSyncExternalStore(subscribe, getSnapshot);
    const { data, callbacks, runAction } = useEspionageData(gov);

    const close = useCallback(() => setState({ gov: state.gov, open: false }), []);

    // Only a successful action closes the modal. If the engine refuses — the
    // price rose, another action started on the same tick — the modal stays
    // up rather than making the click look like it worked.
    const onAction = useCallback((esp: string) => {
        if (runAction(esp)) close();
    }, [runAction, close]);

    return createElement(EspionageModal, {
        data,
        callbacks: { ...callbacks, onAction },
        open,
        onClose: close,
    });
}

/** The host element, created on first use and reused thereafter. */
function espionageHost(): HTMLElement {
    let host = document.getElementById('espionageHost');
    if (!host) {
        host = document.createElement('div');
        host.id = 'espionageHost';
        document.body.appendChild(host);
    }
    return host;
}

/**
 * Open the espionage modal against government `gov`.
 *
 * Called from the legacy foreign-power row. Mounts the island on first use, so
 * there is no ordering requirement between this and whatever draws the row.
 */
export function openEspionageModal(gov: number): void {
    mountIsland(espionageHost(), createElement(EspionageIsland));
    setState({ gov, open: true });
}
