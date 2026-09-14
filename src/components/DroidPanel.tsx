/**
 * The mining droid's ore assignment.
 *
 * The factory's shape in a different place, so it shares ProductRow — the
 * second caller, and the one that earned promoting that row out of
 * FactoryPanel.
 */

import { ProductRow, type ProductOption } from './ProductRow';

export interface DroidData {
    operatingLabel: string;
    levelClass: string;
    assigned: number;
    running: number;
    ores: ProductOption[];
}

export interface DroidCallbacks {
    onAdd: (key: string) => void;
    onSub: (key: string) => void;
}

export function DroidPanel({ data, callbacks }: {
    data: DroidData;
    callbacks: DroidCallbacks;
}) {
    return (
        <>
            <div>
                <span className="has-text-warning">{data.operatingLabel}:</span>{' '}
                <span className={data.levelClass}>{data.assigned}/{data.running}</span>
            </div>
            {data.ores.map(ore => (
                <ProductRow key={ore.key} product={ore} onSub={callbacks.onSub} onAdd={callbacks.onAdd} />
            ))}
        </>
    );
}
