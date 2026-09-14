/**
 * The structure options modal — the gear on a smelter, factory, star dock.
 *
 * The body is still drawn by legacy code: drawModal() hands off to
 * loadIndustry() and friends, each of which builds markup and binds Vue to it.
 * Porting those is a separate job, so this renders an empty #modalBox and lets
 * them fill it, which is the ordinary escape hatch for foreign DOM — React
 * never touches children it did not create.
 *
 * What this replaces is the Buefy modal that used to wrap them, opened through
 * the Vue instance setAction built and then populated by a setInterval polling
 * every 50ms until #modalBox existed. There is no Vue instance any more, so
 * that path had to go regardless.
 */

import { createElement, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { mountIsland } from '../engine/islands';
import { Modal } from './Modal';

export interface StructureModalRequest {
    /** Heading, drawn by the legacy body rather than by Modal. */
    title: string;
    /** Fills #modalBox. Called once the element is on the page. */
    draw: () => void;
    /** Destroys whatever `draw` created, including its Vue instances. */
    cleanup: () => void;
}

let request: StructureModalRequest | null = null;
let open = false;
const listeners = new Set<() => void>();

/** One snapshot object, replaced on change, as useSyncExternalStore expects. */
let snapshot: { request: StructureModalRequest | null; open: boolean } = { request: null, open: false };

function publish(): void {
    snapshot = { request, open };
    listeners.forEach(fn => fn());
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

function StructureModalIsland() {
    const state = useSyncExternalStore(subscribe, () => snapshot);
    const drawn = useRef(false);

    // Drawn in an effect rather than during render: the legacy body builds
    // itself with jQuery and needs #modalBox to exist first.
    useEffect(() => {
        if (state.open && state.request && !drawn.current) {
            drawn.current = true;
            state.request.draw();
        }
    }, [state.open, state.request]);

    const close = () => {
        if (drawn.current && request) {
            // Before React removes the node: the Vue instances inside it need
            // destroying, or they leak and keep updating a detached tree.
            request.cleanup();
            drawn.current = false;
        }
        open = false;
        publish();
    };

    return createElement(Modal, {
        open: state.open,
        onClose: close,
        title: state.request?.title ?? '',
        hideTitle: true,
        children: createElement('div', { id: 'modalBox', className: 'modalBox' }),
    });
}

/** The host element, created on first use. See mountEspionage for the reasoning. */
function modalHost(): HTMLElement {
    let host = document.getElementById('structureModalHost');
    if (!host) {
        host = document.createElement('div');
        host.id = 'structureModalHost';
        document.body.appendChild(host);
    }
    return host;
}

/** Open the options modal for a structure. Called from setAction's gear. */
export function openStructureModal(req: StructureModalRequest): void {
    request = req;
    open = true;
    mountIsland(modalHost(), createElement(StructureModalIsland));
    publish();
}
