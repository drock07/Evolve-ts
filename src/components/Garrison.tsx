/**
 * Garrison — Civics > Government (compact) and Civics > Military (full).
 *
 * One component for both, as the legacy builder was one function with a
 * `full` flag. The compact form drops the training progress and the campaign
 * launch buttons; everything else is shared, and keeping it shared is what
 * stops the two drifting apart.
 *
 * Presentational only. Every number here is computed in useGarrisonData —
 * army ratings, garrison size and merc costs all live in the engine, and
 * recomputing any of them here would be a second source of truth.
 */

import { Fragment } from 'react';

export interface GarrisonCampaign {
    gov: number;
    title: string;
    /** Occupied, annexed or bought: the button offers to withdraw instead. */
    controlled: boolean;
}

export interface GarrisonData {
    display: boolean;
    title: string;
    /** Headline ratings. `offense` is absent once the world is controlled. */
    defenseLabel: string;
    defenseRating: number;
    offenseRating: number | null;
    soldierRatingLabel: string;
    soldierRating: number;

    soldiersLabel: string;
    /** Stationed count. A string because the Halloween egg substitutes markup. */
    stationed: string;
    max: number;
    crewLabel: string;
    crew: number;
    woundedLabel: string;
    wounded: string;

    showMercs: boolean;
    hireLabel: string;

    /** Campaign controls are hidden outside the states that allow raiding. */
    showCampaign: boolean;
    campaignLabel: string;
    tacticName: string;
    battalionLabel: string;
    raid: number;

    /** Full form only. */
    training: { label: string; completeLabel: string; time: string; progress: number } | null;
    campaigns: GarrisonCampaign[];
    launchLabel: string;
    withdrawLabel: string;
}

export interface GarrisonCallbacks {
    onHire: () => void;
    onTacticUp: () => void;
    onTacticDown: () => void;
    onBattalionUp: () => void;
    onBattalionDown: () => void;
    onCampaign: (gov: number) => void;
}

export function Garrison({ data, callbacks, full }: {
    data: GarrisonData;
    callbacks: GarrisonCallbacks;
    full: boolean;
}) {
    // Ids and class names are the legacy ones throughout: the stylesheet and
    // the popover registrations both select on them.
    const prefix = full ? '' : 'c_';

    return (
        <>
            <div className="header">
                <h2 className="has-text-warning">{data.title}</h2>
                {' - '}
                <span className="has-text-success">
                    <span className="defenseRating">{data.defenseLabel} {data.defenseRating}</span>
                    {data.offenseRating !== null && (
                        <>
                            {' / '}
                            <span className="offenseRating">{data.offenseRating}</span>
                        </>
                    )}
                </span>
                {' - '}
                <span className="soldierRating">
                    <span className="has-text-warning">{data.soldierRatingLabel}</span> {data.soldierRating}
                </span>
            </div>

            <div>
                <div className="columns is-mobile bunk">
                    <div className="bunks">
                        <div className="barracks">
                            <span className="soldier">{data.soldiersLabel}</span>{' '}
                            <span dangerouslySetInnerHTML={{ __html: data.stationed }} />
                            {' / '}
                            <span>{data.max}</span>
                        </div>
                        <div className="barracks" hidden={data.crew <= 0}>
                            <span className="crew">{data.crewLabel}</span> <span>{data.crew}</span>
                        </div>
                        <div className="barracks">
                            <span className="wounded">{data.woundedLabel}</span>{' '}
                            <span dangerouslySetInnerHTML={{ __html: data.wounded }} />
                        </div>
                    </div>
                    {data.showMercs && (
                        <div className="hire">
                            <button className="button first hmerc" onClick={callbacks.onHire}>
                                {data.hireLabel}
                            </button>
                            <div />
                        </div>
                    )}
                </div>

                {full && data.training && (
                    <div className="training">
                        <span>
                            {data.training.label} - {data.training.completeLabel} {data.training.time}
                        </span>{' '}
                        <progress className="progress" value={data.training.progress} max={100}>
                            {data.training.progress}%
                        </progress>
                    </div>
                )}

                <div className="columns is-mobile battle">
                    <div className="war">
                        {data.showCampaign && (
                            <>
                                <div id={`${prefix}tactics`} className="tactics">
                                    <span>{data.campaignLabel}</span>
                                    <span
                                        role="button"
                                        aria-label="easier campaign"
                                        className="sub"
                                        onClick={callbacks.onTacticDown}
                                    >&laquo;</span>
                                    <span className="current tactic">{data.tacticName}</span>
                                    <span
                                        role="button"
                                        aria-label="harder campaign"
                                        className="add"
                                        onClick={callbacks.onTacticUp}
                                    >&raquo;</span>
                                </div>
                                <div id={`${prefix}battalion`} className="tactics">
                                    <span>{data.battalionLabel}</span>
                                    <span
                                        role="button"
                                        aria-label="remove soldiers from campaign"
                                        className="sub"
                                        onClick={callbacks.onBattalionDown}
                                    >&laquo;</span>
                                    <span className="current bat">{data.raid}</span>
                                    <span
                                        role="button"
                                        aria-label="add soldiers to campaign"
                                        className="add"
                                        onClick={callbacks.onBattalionUp}
                                    >&raquo;</span>
                                </div>
                            </>
                        )}
                    </div>

                    {full && data.campaigns.map(c => (
                        <Fragment key={c.gov}>
                            <div className={`launch gov${c.gov}`}>
                                <div className="has-text-caution">{c.title}</div>
                                <button className="button campaign" onClick={() => callbacks.onCampaign(c.gov)}>
                                    <span>{c.controlled ? data.withdrawLabel : data.launchLabel}</span>
                                </button>
                            </div>
                        </Fragment>
                    ))}
                </div>
            </div>
        </>
    );
}
