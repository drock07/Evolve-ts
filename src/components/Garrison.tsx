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

import { Fragment, type ElementType, type ReactNode } from 'react';
import { usePopover } from './Popover';

export interface GarrisonCampaign {
    gov: number;
    title: string;
    /** Occupied, annexed or bought: the button offers to withdraw instead. */
    controlled: boolean;
}

export interface GarrisonData {
    /** Hover description for a trigger, computed on demand. Returns HTML. */
    describe: (key: string) => string;
    /** Hover assessment of a campaign against a government. Returns HTML. */
    describeCampaign: (gov: number) => string;
    /** Who the truepath rival is. Shown on their name. Returns HTML. */
    describeRival: () => string;
    /** Popover id prefix, so the two render targets do not collide. */
    popPrefix: string;
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

/**
 * An element that shows a hover description.
 *
 * The description is rendered as HTML because that is what the engine returns
 * — the army rating breakdown is a small table — exactly as the Vue template
 * inside the legacy popover body did.
 *
 * `as` exists because these triggers are not all spans: the mercenary one is
 * the hire button itself. Wrapping instead would change the markup the
 * stylesheet selects on.
 */
function Described({ as: Tag = 'span', popId, describe, children, ...rest }: {
    as?: ElementType;
    popId: string;
    describe: () => string;
    children?: ReactNode;
    [key: string]: unknown;
}) {
    const { triggerProps, popover } = usePopover(
        () => <span dangerouslySetInnerHTML={{ __html: describe() }} />,
        { id: popId },
    );

    return (
        <>
            <Tag {...rest} {...triggerProps}>{children}</Tag>
            {popover}
        </>
    );
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
                    <Described
                        className="defenseRating"
                        popId={`${data.popPrefix}defenseRating`}
                        describe={() => data.describe('defenseRating')}
                    >
                        {data.defenseLabel} {data.defenseRating}
                    </Described>
                    {data.offenseRating !== null && (
                        <>
                            {' / '}
                            <Described
                                className="offenseRating"
                                popId={`${data.popPrefix}offenseRating`}
                                describe={() => data.describe('offenseRating')}
                            >
                                {data.offenseRating}
                            </Described>
                        </>
                    )}
                </span>
                {' - '}
                <Described
                    className="soldierRating"
                    popId={`${data.popPrefix}soldierRating`}
                    describe={() => data.describe('soldierRating')}
                >
                    <span className="has-text-warning">{data.soldierRatingLabel}</span> {data.soldierRating}
                </Described>
            </div>

            <div>
                <div className="columns is-mobile bunk">
                    <div className="bunks">
                        <div className="barracks">
                            <Described
                                className="soldier"
                                popId={`${data.popPrefix}soldier`}
                                describe={() => data.describe('soldier')}
                            >{data.soldiersLabel}</Described>{' '}
                            <span dangerouslySetInnerHTML={{ __html: data.stationed }} />
                            {' / '}
                            <span>{data.max}</span>
                        </div>
                        <div className="barracks" hidden={data.crew <= 0}>
                            <Described
                                className="crew"
                                popId={`${data.popPrefix}crew`}
                                describe={() => data.describe('crew')}
                            >{data.crewLabel}</Described> <span>{data.crew}</span>
                        </div>
                        <div className="barracks">
                            <Described
                                className="wounded"
                                popId={`${data.popPrefix}wounded`}
                                describe={() => data.describe('wounded')}
                            >{data.woundedLabel}</Described>{' '}
                            <span dangerouslySetInnerHTML={{ __html: data.wounded }} />
                        </div>
                    </div>
                    {data.showMercs && (
                        <div className="hire">
                            <Described
                                as="button"
                                className="button first hmerc"
                                onClick={callbacks.onHire}
                                popId={`${data.popPrefix}hmerc`}
                                describe={() => data.describe('hmerc')}
                            >
                                {data.hireLabel}
                            </Described>
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
                                    <Described
                                        className="current tactic"
                                        popId={`${data.popPrefix}tactic`}
                                        describe={() => data.describe('tactic')}
                                    >{data.tacticName}</Described>
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
                                    <Described
                                        className="current bat"
                                        popId={`${data.popPrefix}bat`}
                                        describe={() => data.describe('bat')}
                                    >{data.raid}</Described>
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
                                {c.gov === 3 ? (
                                    <Described
                                        as="div"
                                        className="has-text-caution"
                                        popId="garRivaldesc2"
                                        describe={data.describeRival}
                                    >{c.title}</Described>
                                ) : (
                                    <div className="has-text-caution">{c.title}</div>
                                )}
                                <Described
                                    as="button"
                                    className="button campaign"
                                    onClick={() => callbacks.onCampaign(c.gov)}
                                    popId={`${data.popPrefix}${c.gov}`}
                                    describe={() => data.describeCampaign(c.gov)}
                                >
                                    <span>{c.controlled ? data.withdrawLabel : data.launchLabel}</span>
                                </Described>
                            </div>
                        </Fragment>
                    ))}
                </div>
            </div>
        </>
    );
}
