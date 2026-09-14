/**
 * A structure button — one per building, in every region of the game.
 *
 * Ported from setAction() in actions.ts, which is a single renderer
 * instantiated per structure: the city's 42 buildings, and everything in
 * space, the portal, truepath and edenic besides. It is the most-reused view
 * in the codebase, which is why it is worth porting early and why it is worth
 * pinning first (tests/e2e/structures.spec.ts).
 *
 * The container div stays legacy. It carries `action`, the highlight class,
 * the affordability classes and the prediction attributes, and those are
 * toggled from jQuery in the loop's render passes — so React takes the
 * contents and leaves the element itself alone, which is the same split every
 * other island uses.
 *
 * Several fields arrive as HTML rather than text. The title, the power
 * readouts and the emblem all pass through engine filters that can substitute
 * seasonal markup, so they are rendered as markup exactly as the Vue template
 * did.
 */

export interface StructurePower {
    /** Rendered "on" readout. HTML: an easter egg can replace the number. */
    onHtml: string;
    /** Rendered "off" readout. HTML, for the same reason. */
    offHtml: string;
    /** Accessible labels, e.g. "on: 6". */
    onLabel: string;
    offLabel: string;
    /** False for the fixed readouts that cannot be clicked. */
    interactive: boolean;
}

export interface StructureData {
    /** The structure's name. HTML. */
    title: string;
    /** Cost classes for the button, e.g. ['res-Money', 'res-Lumber']. */
    costClasses: string[];
    /** Cost amounts, rendered as data-money="4893" and so on. */
    costData: Record<string, number>;
    /** Extra classes from the action's own `class`, `aura`, or prediction. */
    extraClass: string;
    /** Screen-reader-only active/inactive marker, when the action has one. */
    activeLabel: string | null;
    /** Built count, or null when this action does not carry one. */
    count: number | null;
    /** Power readouts, when the structure has them. */
    power: StructurePower | null;
    /** Whether the options control is offered. */
    special: boolean;
    /** Options control's accessible title, e.g. "Smelter options". */
    specialTitle: string;
    /** Repair progress, for structures that can be damaged. */
    repair: { value: number; max: number } | null;
    /** Emblem markup appended after the button, when the action has one. */
    emblem: string | null;
    /** Screen-reader description link text. */
    describeLabel: string;
}

export interface StructureCallbacks {
    onAction: () => void;
    onDescribe: () => void;
    onPowerOn: () => void;
    onPowerOff: () => void;
    onSpecial: () => void;
}

/** The gear, drawn inline because it is the only icon in the markup. */
function GearIcon() {
    return (
        <svg
            version="1.1" x="0px" y="0px" width="12px" height="12px"
            viewBox="340 140 280 279.416" enableBackground="new 340 140 280 279.416"
            xmlSpace="preserve"
        >
            <path
                className="gear"
                d="M620,305.666v-51.333l-31.5-5.25c-2.333-8.75-5.833-16.917-9.917-23.917L597.25,199.5l-36.167-36.75l-26.25,18.083
                c-7.583-4.083-15.75-7.583-23.916-9.917L505.667,140h-51.334l-5.25,31.5c-8.75,2.333-16.333,5.833-23.916,9.916L399.5,163.333
                L362.75,199.5l18.667,25.666c-4.083,7.584-7.583,15.75-9.917,24.5l-31.5,4.667v51.333l31.5,5.25
                c2.333,8.75,5.833,16.334,9.917,23.917l-18.667,26.25l36.167,36.167l26.25-18.667c7.583,4.083,15.75,7.583,24.5,9.917l5.25,30.916
                h51.333l5.25-31.5c8.167-2.333,16.333-5.833,23.917-9.916l26.25,18.666l36.166-36.166l-18.666-26.25
                c4.083-7.584,7.583-15.167,9.916-23.917L620,305.666z M480,333.666c-29.75,0-53.667-23.916-53.667-53.666s24.5-53.667,53.667-53.667
                S533.667,250.25,533.667,280S509.75,333.666,480,333.666z"
            />
        </svg>
    );
}

export function StructureButton({ data, callbacks }: {
    data: StructureData;
    callbacks: StructureCallbacks;
}) {
    const buttonClass = [
        'button', 'is-dark',
        ...data.costClasses,
        data.extraClass,
    ].filter(Boolean).join(' ');

    const costAttrs: Record<string, string> = {};
    for (const [res, amount] of Object.entries(data.costData)) {
        costAttrs[`data-${res}`] = String(amount);
    }

    return (
        <>
            <a className={buttonClass} {...costAttrs} role="link" onClick={callbacks.onAction}>
                <span className="aTitle" dangerouslySetInnerHTML={{ __html: data.title }} />
                {data.activeLabel && <span className="is-sr-only">{data.activeLabel}</span>}
                {data.count !== null && <span className="count">{data.count}</span>}
            </a>

            {/*
                The screen-reader description link. It deliberately does not
                repeat the count: the legacy markup appended the count span to
                a two-element jQuery set, so it landed here too and this link
                announced "Hut description45".
            */}
            <a role="button" className="is-sr-only" onClick={callbacks.onDescribe}>
                {data.describeLabel}
            </a>

            {data.special && (
                <div
                    className="special"
                    role="button"
                    title={data.specialTitle}
                    onClick={callbacks.onSpecial}
                >
                    <GearIcon />
                </div>
            )}

            {data.power && (
                <>
                    <span
                        className="on"
                        title="ON"
                        {...(data.power.interactive
                            ? { role: 'button', 'aria-label': data.power.onLabel, onClick: callbacks.onPowerOn }
                            : {})}
                        dangerouslySetInnerHTML={{ __html: data.power.onHtml }}
                    />
                    <span
                        className="off"
                        title="OFF"
                        {...(data.power.interactive
                            ? { role: 'button', 'aria-label': data.power.offLabel, onClick: callbacks.onPowerOff }
                            : {})}
                        dangerouslySetInnerHTML={{ __html: data.power.offHtml }}
                    />
                </>
            )}

            {data.repair && (
                <div className="repair">
                    <progress className="progress" value={data.repair.value} max={data.repair.max} />
                </div>
            )}

            {data.emblem && <span dangerouslySetInnerHTML={{ __html: data.emblem }} />}
        </>
    );
}
