/**
 * The factory panel — its options modal, and its row in the Industry tab.
 *
 * Second of the twelve industry panels. It shares the smelter's idea — a pool
 * distributed across options against a cap — but not its markup: each product
 * is its own row, with the label first and the stepper pair after it. The
 * shared piece is the data shape, not the layout, so this has its own row
 * rather than bending the smelter's into two shapes.
 */

import { ProductRow, type ProductOption } from './ProductRow';


export type FactoryProduct = ProductOption;

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
