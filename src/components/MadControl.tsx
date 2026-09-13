/**
 * Mutual Assured Destruction control — Civics > Military.
 *
 * Ported from the Vue instance that bound to #mad. Beware the inversion:
 * `armed: false` is the LIVE state. See CivicFixed.mad in types/state.ts.
 */

export interface MadControlData {
    /** Whether the panel shows at all. */
    display: boolean;
    /** Engine flag. FALSE means live — see the note above. */
    armed: boolean;
    warning: string;
    /** 'Arm Missiles' when safe, 'Disarm Missiles' when live. */
    armLabel: string;
    launchLabel: string;
}

export interface MadControlCallbacks {
    onArm: () => void;
    onLaunch: () => void;
}

export function MadControl({ data, callbacks }: { data: MadControlData; callbacks: MadControlCallbacks }) {
    if (!data.display) return null;

    return (
        <div className="mad">
            <div className="warn">{data.warning}</div>
            <div className="defcon mdarm">
                <button className="button arm" onClick={callbacks.onArm}>
                    {data.armLabel}
                </button>
            </div>
            <div className="defcon mdlaunch">
                {/* Disabled while safe, matching the original :disabled="armed". */}
                <button className="button" disabled={data.armed} onClick={callbacks.onLaunch}>
                    {data.launchLabel}
                </button>
            </div>
        </div>
    );
}
