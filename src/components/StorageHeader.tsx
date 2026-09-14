/**
 * The two construction buttons above the storage rows.
 *
 * Each was wrapped in a <b-tooltip> whose label doubled as the button's
 * accessible name. The React popover shows the same text, and the label stays
 * on the button where a screen reader expects it.
 */

import { usePopover } from './Popover';

export interface StorageHeaderButton {
    kind: string;
    label: string;
    /** What it costs and how much it holds. Doubles as the accessible name. */
    description: string;
    visible: boolean;
    className: string;
}

export interface StorageHeaderData {
    title: string;
    buttons: StorageHeaderButton[];
}

export interface StorageHeaderCallbacks {
    onConstruct: (kind: string) => void;
}

function ConstructButton({ button, onConstruct }: {
    button: StorageHeaderButton;
    onConstruct: (kind: string) => void;
}) {
    const { triggerProps, popover } = usePopover(
        () => <span>{button.description}</span>,
        { id: `construct-${button.kind}`, wide: true },
    );

    return (
        <div className={button.className} hidden={!button.visible} {...triggerProps}>
            <button
                aria-label={button.description}
                className="button"
                onClick={() => onConstruct(button.kind)}
            >
                {button.label}
            </button>
            {popover}
        </div>
    );
}

export function StorageHeader({ data, callbacks }: {
    data: StorageHeaderData;
    callbacks: StorageHeaderCallbacks;
}) {
    return (
        <>
            <h2 className="is-sr-only">{data.title}</h2>
            {data.buttons.map(button => (
                <ConstructButton key={button.kind} button={button} onConstruct={callbacks.onConstruct} />
            ))}
        </>
    );
}
