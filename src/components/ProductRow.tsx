/**
 * One product in a pool, laid out as its own row: label, then the steppers.
 *
 * The other row shape in this codebase. AllocationRow puts its steppers as
 * flat siblings around a combined readout; this wraps each option in its own
 * element with the label first. Both exist because the stylesheet distinguishes
 * them, and neither is a variant of the other.
 *
 * Callers so far: the factory and the mining droid. As with AllocationRow,
 * what they share is the data shape and the stepping — never the rule for
 * where a unit comes from when the pool is full. Four panels now have four
 * different rules for that, including the droid, which has none at all and
 * simply stops.
 */

import { usePopover } from './Popover';

export interface ProductOption {
    /** Engine key, e.g. 'Alloy'. */
    key: string;
    /** Display name, already localised. */
    label: string;
    /** Number of factories on this product. HTML: a trick can replace it. */
    valueHtml: string;
    /** What it consumes and how many are on it, as the accessible label. */
    ariaLabel: string;
    /** What it consumes, shown on hover. */
    description: string;
    popId: string;
    subLabel: string;
    addLabel: string;
}

export function ProductRow({ product, onSub, onAdd }: {
    product: ProductOption;
    onSub: (key: string) => void;
    onAdd: (key: string) => void;
}) {
    // Was a legacy popover bound by selector after the panel was drawn, which
    // React's asynchronous render would have left attached to nothing.
    const { triggerProps, popover } = usePopover(
        () => <span dangerouslySetInnerHTML={{ __html: product.description }} />,
        { id: product.popId },
    );

    return (
        <div className="factory">
            <span className={product.key} aria-label={product.ariaLabel} {...triggerProps}>
                {product.label}
            </span>
            {popover}
            <span className="sub" role="button" aria-label={product.subLabel} onClick={() => onSub(product.key)}>
                &laquo;
            </span>
            <span className="current" dangerouslySetInnerHTML={{ __html: product.valueHtml }} />
            <span className="add" role="button" aria-label={product.addLabel} onClick={() => onAdd(product.key)}>
                &raquo;
            </span>
        </div>
    );
}
