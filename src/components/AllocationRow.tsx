/**
 * One option in a pool being distributed — a fuel, an output, a product.
 *
 * Shared by the panels whose steppers sit as flat siblings: the smelter and
 * the graphene plant so far. The factory is deliberately not among them; it
 * lays each option out as its own row, and bending this into two shapes to
 * cover that would serve the abstraction rather than the code.
 *
 * What the callers genuinely share is this data shape and the stepping
 * behaviour, not the markup. Three panels now, with three different rules for
 * where a smelter comes from when the pool is full — a fixed order of donors,
 * one nominated donor, or whichever donor is currently largest — so the policy
 * belongs to the caller and the row knows nothing about it.
 */

import { usePopover } from './Popover';

export interface AllocationOption {
    /** Engine key, e.g. 'Wood' or 'Iron'. Identifies the option to callbacks. */
    key: string;
    /** Classes for the readout, e.g. 'wood' or 'oil infoOnly'. */
    className: string;
    /** Display name, already localised. */
    label: string;
    /** The count. HTML: a seasonal trick can replace the number. */
    valueHtml: string;
    /** Full description, used as the accessible label. */
    ariaLabel: string;
    /** Info-only rows (a forge, a star) show a number but take no input. */
    interactive: boolean;
    subLabel: string;
    addLabel: string;
    /** Hover description: what this fuel costs, or what this output does. */
    description: string;
    /** Popover id, matching the one the legacy registered. */
    popId: string;
}

export function AllocationRow({ option, onSub, onAdd }: {
    option: AllocationOption;
    onSub: (key: string) => void;
    onAdd: (key: string) => void;
}) {
    // The description was a legacy popover bound by selector immediately after
    // the panel was drawn. React renders asynchronously, so that binding would
    // have matched nothing — the same way three others died before anyone
    // noticed. It belongs to the row now.
    const { triggerProps, popover } = usePopover(
        () => <span dangerouslySetInnerHTML={{ __html: option.description }} />,
        { id: option.popId },
    );

    // The readout sits between its two steppers, and the row is flat rather
    // than wrapped: the stylesheet lays these out as siblings.
    return (
        <>
            {option.interactive && (
                <span role="button" className="sub" aria-label={option.subLabel} onClick={() => onSub(option.key)}>
                    <span>&laquo;</span>
                </span>
            )}
            <span
                className={`current ${option.className}`}
                aria-label={option.ariaLabel}
                {...triggerProps}
            >
                {option.label}{' '}
                <span dangerouslySetInnerHTML={{ __html: option.valueHtml }} />
            </span>
            {popover}
            {option.interactive && (
                <span role="button" className="add" aria-label={option.addLabel} onClick={() => onAdd(option.key)}>
                    <span>&raquo;</span>
                </span>
            )}
        </>
    );
}
