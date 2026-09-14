/**
 * Espionage actions modal — the "Espionage" button on each foreign power.
 *
 * The original opened a Buefy modal and then polled with setInterval every
 * 50ms until #modalBox appeared before drawing the buttons into it. The modal
 * is React state here, so the buttons render with it and the poll is gone.
 *
 * Which actions appear is the same chain of conditions drawEspModal used:
 * influence and sabotage always, incite only against the three original
 * powers, annex and purchase only when their own preconditions hold. Whether
 * an action can be *taken* is re-checked in the engine, not here — this only
 * decides what is worth showing.
 */

import { useEffect } from 'react';
import { Modal } from './Modal';

export interface EspionageAction {
    /** Action id, exposed as data-esp for the description popovers. */
    esp: string;
    label: string;
}

export interface EspionageData {
    title: string;
    actions: EspionageAction[];
}

export interface EspionageCallbacks {
    onAction: (esp: string) => void;
    /** Attach the per-action description popovers once they are on the page. */
    onActionsRendered: () => void;
}

export function EspionageModal({
    data, callbacks, open, onClose,
}: {
    data: EspionageData;
    callbacks: EspionageCallbacks;
    open: boolean;
    onClose: () => void;
}) {
    // The legacy popover system binds to elements matching a selector at call
    // time, so it can only run once the buttons exist.
    useEffect(() => {
        if (open) callbacks.onActionsRendered();
    }, [open, callbacks]);

    return (
        <Modal open={open} onClose={onClose} title={data.title}>
            <div id="espModal" className="modalBody max40">
                {data.actions.map(action => (
                    <button
                        key={action.esp}
                        className="button gap"
                        data-esp={action.esp}
                        onClick={() => callbacks.onAction(action.esp)}
                    >
                        {action.label}
                    </button>
                ))}
            </div>
        </Modal>
    );
}
