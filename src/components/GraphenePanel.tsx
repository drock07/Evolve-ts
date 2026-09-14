/**
 * The graphene plant's fuel allocation.
 *
 * The smelter's shape in a different place, so it shares AllocationRow — the
 * third caller, and the one that made promoting that row out of SmelterPanel
 * worth doing.
 */

import { AllocationRow, type AllocationOption } from './AllocationRow';

export interface GrapheneData {
    fuelLabel: string;
    levelClass: string;
    fuelled: number;
    running: number;
    fuels: AllocationOption[];
}

export interface GrapheneCallbacks {
    onAdd: (key: string) => void;
    onSub: (key: string) => void;
}

export function GraphenePanel({ data, callbacks }: {
    data: GrapheneData;
    callbacks: GrapheneCallbacks;
}) {
    return (
        <>
            <div>
                <span className="has-text-warning">{data.fuelLabel}:</span>{' '}
                <span className={data.levelClass}>{data.fuelled}/{data.running}</span>
            </div>
            <div>
                {data.fuels.map(option => (
                    <AllocationRow
                        key={option.key}
                        option={option}
                        onSub={callbacks.onSub}
                        onAdd={callbacks.onAdd}
                    />
                ))}
            </div>
        </>
    );
}
