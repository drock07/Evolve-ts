/**
 * ResourceRow — pure presentational component for a single resource.
 *
 * Takes all display data and callbacks as props. Has no knowledge of
 * the game engine, global state, or legacy code.
 */

// ── Types ──

export interface ResourceRowData {
    /** Internal resource key (e.g., 'Food', 'Lumber', 'RNA') */
    id: string;
    /** Localized display name */
    displayName: string;
    /** Current amount (already formatted) */
    amount: string;
    /** Max capacity (already formatted), null if uncapped */
    max: string | null;
    /** Production rate (already formatted) */
    diff: string;
    /** CSS color class suffix (e.g., 'info', 'warning', 'success', 'danger') */
    color: string;
    /** Whether the resource is currently visible */
    display: boolean;
    /** Whether this is a crafted resource (max === -1) */
    isCrafted: boolean;
    /** Whether this is a special resource (max === -2) */
    isSpecial: boolean;
    /** Whether crate/container management is available */
    stackable: boolean;
    /** Whether crates UI is unlocked */
    cratesUnlocked: boolean;
    /** Whether to show the production rate */
    showRate: boolean;
    /** Whether to show crafting buttons */
    showCraft: boolean;
    /** Whether to show fasting-style rate (no /s suffix) */
    showFasting: boolean;
    /** Whether the capacity bar is enabled and visible */
    showBar: boolean;
    /** Percentage full (0-100) for the capacity bar */
    percentFull: number;
    /** Whether the resource is near capacity (>= 99%) */
    nearCap: boolean;
    /** CSS class for the diff/rate color (e.g., 'has-text-danger') */
    diffColorClass: string;
}

export interface ResourceRowCallbacks {
    /** Toggle the capacity bar display */
    onToggleBar?: () => void;
    /** Craft a specific volume (1, 5, or 'A' for all) */
    onCraft?: (vol: number | 'A') => void;
    /** Mouse enters the row */
    onMouseOver?: () => void;
    /** Mouse leaves the row */
    onMouseOut?: () => void;
}

export interface ResourceRowProps {
    resource: ResourceRowData;
    callbacks?: ResourceRowCallbacks;
}

// ── Component ──

export function ResourceRow({ resource: res, callbacks }: ResourceRowProps) {
    if (!res.display) {
        return null;
    }

    const containerClasses = [
        'resource',
        res.isCrafted || res.isSpecial ? 'crafted' : '',
        res.showBar ? 'showBar' : '',
    ].filter(Boolean).join(' ');

    const style = res.showBar && res.percentFull > 0
        ? { '--percent-full': `${res.percentFull}%` } as React.CSSProperties
        : undefined;

    const showNameClick = !res.isCrafted && !res.isSpecial;

    return (
        <div
            id={`res${res.id}`}
            className={containerClasses}
            style={style}
            onMouseOver={callbacks?.onMouseOver}
            onMouseOut={callbacks?.onMouseOut}
        >
            <div>
                <h3
                    className={`res has-text-${res.color}${showNameClick ? ' bar' : ''}`}
                    onClick={showNameClick ? callbacks?.onToggleBar : undefined}
                >
                    {res.displayName}
                </h3>
                <span id={`cnt${res.id}`} className={`count${res.nearCap ? ' has-text-warning' : ''}`}>
                    {res.isCrafted || res.isSpecial
                        ? res.amount
                        : `${res.amount} / ${res.max}`
                    }
                </span>
            </div>

            {res.stackable && (
                <span>
                    {res.cratesUnlocked && (
                        <span
                            id={`con${res.id}`}
                            className="interact has-text-success"
                            role="button"
                            aria-label={`Open crate management for ${res.displayName}`}
                        >
                            +
                        </span>
                    )}
                </span>
            )}
            {!res.stackable && !res.showCraft && <span></span>}

            {res.showRate && (
                <span
                    id={`inc${res.id}`}
                    className={`diff ${res.diffColorClass}`}
                    aria-label={`${res.displayName} ${res.diff} per second`}
                >
                    {res.diff} /s
                </span>
            )}

            {res.showFasting && !res.showRate && (
                <span
                    id={`inc${res.id}`}
                    className={`diff ${res.diffColorClass}`}
                    aria-label={`${res.displayName} ${res.diff}`}
                >
                    {res.diff}
                </span>
            )}

            {res.showCraft && (
                <span className="craftable">
                    {[1, 5].map(vol => (
                        <span id={`inc${res.id}${vol}`} key={vol}>
                            <a
                                onClick={() => callbacks?.onCraft?.(vol)}
                                aria-label={`craft ${vol} ${res.displayName}`}
                                role="button"
                            >
                                +<span className="craft" data-val={vol}>{vol}</span>
                            </a>
                        </span>
                    ))}
                    <span id={`inc${res.id}A`}>
                        <a
                            onClick={() => callbacks?.onCraft?.('A')}
                            aria-label={`craft max ${res.displayName}`}
                            role="button"
                        >
                            +<span className="craft" data-val="A">A</span>
                        </a>
                    </span>
                </span>
            )}

            {!res.showRate && !res.showFasting && !res.showCraft && !res.stackable && <span></span>}
        </div>
    );
}
