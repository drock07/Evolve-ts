/**
 * Reusable modal, built on the native <dialog> element.
 *
 * Deliberately not a library component. The parts of a modal that are actually
 * hard — trapping focus, restoring it on close, Escape-to-dismiss, and sitting
 * above everything else on the page — are all things `showModal()` does for
 * free, so a dependency would mostly be re-implementing the platform.
 *
 * The top layer matters more here than it would in most apps. The game stacks
 * popovers, tooltips and nested tab panels, all competing over z-index, and an
 * island is often rendered deep inside legacy DOM with its own stacking
 * context. A top-layer dialog escapes all of that by definition — no portal,
 * no z-index arms race, no `overflow: hidden` ancestor clipping it.
 *
 * What is left for us: opening and closing in step with React state, dismissing
 * on a backdrop click, and labelling the dialog for assistive tech.
 */

import { useCallback, useEffect, useRef, type ReactNode } from 'react';

export interface ModalProps {
    open: boolean;
    /**
     * Called whenever the dialog wants to close — Escape, the close button, or
     * a backdrop click. The parent owns `open`, so nothing closes without it.
     */
    onClose: () => void;
    /** Accessible name. Rendered as the heading unless `hideTitle` is set. */
    title: string;
    hideTitle?: boolean;
    /** Extra classes on the inner panel, for the legacy stylesheet. */
    className?: string;
    children: ReactNode;
}

export function Modal({ open, onClose, title, hideTitle, className, children }: ModalProps) {
    const ref = useRef<HTMLDialogElement>(null);

    // Drive the element's modal state from the `open` prop. showModal() throws
    // if the dialog is already open, and close() on a closed dialog is a no-op,
    // so both directions are guarded.
    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;

        if (open && !dialog.open) {
            dialog.showModal();
        }
        else if (!open && dialog.open) {
            dialog.close();
        }
    }, [open]);

    // Escape closes the dialog natively, which fires `close` without going
    // through our handler. Listening here keeps React's state in step rather
    // than leaving `open` true over a shut dialog.
    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;

        const handleClose = () => onClose();
        dialog.addEventListener('close', handleClose);
        return () => dialog.removeEventListener('close', handleClose);
    }, [onClose]);

    /**
     * Dismiss on a backdrop click.
     *
     * The backdrop is not a separate element, so a click on it lands on the
     * dialog itself. Comparing the target to the dialog distinguishes that from
     * a click on anything inside the panel.
     */
    const handleClick = useCallback((event: React.MouseEvent<HTMLDialogElement>) => {
        if (event.target === ref.current) onClose();
    }, [onClose]);

    return (
        <dialog ref={ref} className="evolveModal" onClick={handleClick} aria-label={hideTitle ? title : undefined}>
            {/*
                Contents are mounted only while open. A <dialog> stays in the
                document when closed — unlike the Buefy modal this replaced,
                which destroyed its node — so without this the panel and every
                effect inside it would live on invisibly, and selectors looking
                for modal content would still find it.
            */}
            {open && (
                <div className={`modalBox${className ? ` ${className}` : ''}`}>
                    {!hideTitle && <h2 className="modalTitle">{title}</h2>}
                    <button
                        type="button"
                        className="modalClose"
                        aria-label="close"
                        onClick={onClose}
                    >
                        &times;
                    </button>
                    {children}
                </div>
            )}
        </dialog>
    );
}
