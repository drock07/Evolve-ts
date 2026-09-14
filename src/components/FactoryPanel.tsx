/**
 * The factory panel — its options modal, and its row in the Industry tab.
 *
 * Second of the twelve industry panels. It shares the smelter's idea — a pool
 * distributed across options against a cap — but not its markup: each product
 * is its own row, with the label first and the stepper pair after it. The
 * shared piece is the data shape, not the layout, so this has its own row
 * rather than bending the smelter's into two shapes.
 */

import { usePopover } from './Popover';

export interface FactoryProduct {
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

export interface FactoryData {
    /** "Operating" heading. */
    operatingLabel: string;
    levelClass: string;
    /** Factories currently assigned, against the number available. */
    assigned: number;
    max: number;
    products: FactoryProduct[];
}

export interface FactoryCallbacks {
    onAdd: (key: string) => void;
    onSub: (key: string) => void;
}

function ProductRow({ product, onSub, onAdd }: {
    product: FactoryProduct;
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

export function FactoryPanel({ data, callbacks }: {
    data: FactoryData;
    callbacks: FactoryCallbacks;
}) {
    return (
        <>
            <div>
                <span className="has-text-warning">{data.operatingLabel}:</span>{' '}
                <span className={data.levelClass}>{data.assigned}/{data.max}</span>
            </div>
            {data.products.map(product => (
                <ProductRow
                    key={product.key}
                    product={product}
                    onSub={callbacks.onSub}
                    onAdd={callbacks.onAdd}
                />
            ))}
        </>
    );
}
