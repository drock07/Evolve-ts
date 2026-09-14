/**
 * The smelter panel — its options modal, and its row in the Industry tab.
 *
 * First of twelve industry panels, and the shape they all share: a pool of
 * built structures distributed across options by « and » steppers, with a
 * running total against a cap. AllocationRow below is the piece meant to
 * outlive this file.
 *
 * Two render targets again, as the garrison had: the modal reached from the
 * smelter's gear, and the Industry tab. They differ only in the element ids
 * the stylesheet hangs off, so those arrive as data.
 */

import { AllocationRow, type AllocationOption } from './AllocationRow';



export type { AllocationOption };

export interface SmelterData {
    /** "Fuelled" heading. */
    fuelLabel: string;
    /** Colour class from the engine's own range helper. */
    fuelLevelClass: string;
    fuelOn: number;
    fuelCap: number;
    /** Seasonal markup prepended to the heading, when there is any. */
    eggHtml: string | null;
    /** Element id for the fuel row: differs between the modal and the tab. */
    fuelsId: string;
    fuels: AllocationOption[];

    /** Smelting output is hidden until something beyond iron is unlocked. */
    showMaterials: boolean;
    materialsId: string;
    materialLabel: string;
    materialLevelClass: string;
    materialOn: number;
    materialCap: number;
    materials: AllocationOption[];
}

export interface SmelterCallbacks {
    onAddFuel: (key: string) => void;
    onSubFuel: (key: string) => void;
    onAddMetal: (key: string) => void;
    onSubMetal: (key: string) => void;
}

export function SmelterPanel({ data, callbacks }: {
    data: SmelterData;
    callbacks: SmelterCallbacks;
}) {
    return (
        <>
            <div>
                {data.eggHtml && <span dangerouslySetInnerHTML={{ __html: data.eggHtml }} />}
                <span className="has-text-warning">{data.fuelLabel}:</span>{' '}
                <span className={data.fuelLevelClass}>{data.fuelOn}/{data.fuelCap}</span>
            </div>

            <div id={data.fuelsId} className="fuels">
                {data.fuels.map(option => (
                    <AllocationRow
                        key={option.key}
                        option={option}
                        onSub={callbacks.onSubFuel}
                        onAdd={callbacks.onAddFuel}
                    />
                ))}
            </div>

            {/*
                Kept because the stylesheet spaces the panel with it. The legacy
                filled it under `if (!bind && 1 === 2)` — permanently false, so
                it has always been empty.
            */}
            <div className="avail" />

            {data.showMaterials && (
                <div id={data.materialsId} className="smelting">
                    <div>
                        <span className="has-text-warning">{data.materialLabel}:</span>{' '}
                        <span className={data.materialLevelClass}>
                            {data.materialOn}/{data.materialCap}
                        </span>
                    </div>
                    <div className="fuels">
                        {data.materials.map(option => (
                            <AllocationRow
                                key={option.key}
                                option={option}
                                onSub={callbacks.onSubMetal}
                                onAdd={callbacks.onAddMetal}
                            />
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}
