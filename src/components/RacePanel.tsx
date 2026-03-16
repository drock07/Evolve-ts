/**
 * RacePanel — pure presentational component.
 *
 * Displays the race name, morale, and power status in the left sidebar.
 */

export interface RacePanelData {
    name: string;
    morale: number | null;
    power: number | null;
    powerTotal: number | null;
    showPower: boolean;
}

export function RacePanel({ data }: { data: RacePanelData }) {
    return (
        <>
            <h2 className="is-sr-only">Race Info</h2>
            <div className="name">{data.name}</div>
            {data.morale !== null && data.morale > 0 && (
                <div className="morale-contain">
                    <span id="morale" className="morale">
                        Morale <span className="has-text-warning">{data.morale.toFixed(1)}%</span>
                    </span>
                </div>
            )}
            {data.showPower && data.power !== null && (
                <div className="power">
                    <span id="powerStatus" className="has-text-warning">
                        <span>MW</span>{' '}
                        <span id="powerMeter" className="meter">{data.power.toFixed(2)}</span>
                    </span>
                </div>
            )}
        </>
    );
}
