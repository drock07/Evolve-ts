/**
 * Government selector and its change modal — Civics > Government.
 *
 * The original opened a Buefy modal and then polled with setInterval every
 * 50ms until the modal's DOM appeared before populating it. Owning the modal
 * as React state removes that entirely: the options render with the modal.
 */

import { useEffect } from 'react';
import { Modal } from './Modal';
import { usePopover } from './Popover';

export interface GovernmentOption {
    /** Government id, exposed as data-gov for the description popovers. */
    gov: string;
    label: string;
}

export interface GovernmentData {
    display: boolean;
    /** "System of Government:" */
    prefix: string;
    /** Localised name of the government in force. */
    current: string;
    /** 'Set Government' from anarchy, otherwise 'Start Revolution'. */
    buttonLabel: string;
    /** A revolution already running blocks another change. */
    disabled: boolean;
    modalTitle: string;
    options: GovernmentOption[];
    /** What the government in force does. HTML. */
    currentDescription: () => string;
    /** What the change button will do, given whether a revolution is running. */
    changeDescription: () => string;
}

export interface GovernmentCallbacks {
    onSelect: (gov: string) => void;
    /** Attach the per-option description popovers once they are on the page. */
    onOptionsRendered: () => void;
}

export function GovernmentSelector({
    data, callbacks, open, onOpenChange,
}: {
    data: GovernmentData;
    callbacks: GovernmentCallbacks;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    // The legacy popover system binds to elements matching a selector at call
    // time, so it can only run once the options exist.
    useEffect(() => {
        if (open) callbacks.onOptionsRendered();
    }, [open, callbacks]);

    // These two were legacy popovers until they stopped working. Both bound by
    // selector immediately after mountGovernment(), and React renders
    // asynchronously, so they attached to elements that did not exist yet and
    // neither description ever appeared.
    const label = usePopover(
        () => <span dangerouslySetInnerHTML={{ __html: data.currentDescription() }} />,
        { id: 'govLabel' },
    );
    const change = usePopover(
        () => <span>{data.changeDescription()}</span>,
        { id: 'govTypeChange' },
    );

    if (!data.display) return null;

    return (
        <>
            <div>
                {data.prefix}{' '}
                <span id="govLabel" className="has-text-warning" {...label.triggerProps}>
                    {data.current}
                </span>
                {label.popover}
            </div>
            <div>
                <span className="change inline" {...change.triggerProps}>
                    {change.popover}
                    <button
                        className="button"
                        disabled={data.disabled}
                        onClick={() => onOpenChange(true)}
                    >
                        {data.buttonLabel}
                    </button>
                </span>
            </div>

            <Modal
                open={open}
                onClose={() => onOpenChange(false)}
                title={data.modalTitle}
            >
                <div id="govModal" className="modalBody max40">
                    {data.options.map(opt => (
                        <button
                            key={opt.gov}
                            className="button gap"
                            data-gov={opt.gov}
                            onClick={() => callbacks.onSelect(opt.gov)}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </Modal>
        </>
    );
}
