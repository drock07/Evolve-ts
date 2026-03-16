/**
 * EvolutionTab — pure presentational component.
 *
 * Renders protoplasm-phase evolution action buttons from props.
 * Has no knowledge of the game engine or global state.
 */

import { useState } from 'react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';

// ── Types ──

export interface EvolutionCost {
    /** Resource display name */
    label: string;
    /** Amount required */
    amount: number;
    /** Whether the player can afford this cost */
    affordable: boolean;
}

export interface EvolutionActionData {
    /** Unique id (e.g., 'evolution-rna') */
    id: string;
    /** Display title */
    title: string;
    /** Description text */
    desc: string;
    /** Effect description */
    effect?: string;
    /** Current count (e.g., number of membranes built) */
    count?: number;
    /** Resource costs */
    costs: EvolutionCost[];
    /** Whether the player can fully afford this action */
    canAfford: boolean;
    /** Whether the player can afford at reduced threshold */
    canAffordSome: boolean;
}

export interface EvolutionActionCallbacks {
    onClick: () => void;
}

export interface EvolutionTabProps {
    actions: Array<{
        action: EvolutionActionData;
        callbacks: EvolutionActionCallbacks;
    }>;
}

// ── Components ──

function EvolutionAction({ action, callbacks }: {
    action: EvolutionActionData;
    callbacks: EvolutionActionCallbacks;
}) {
    const [hovered, setHovered] = useState(false);

    let className = 'action';
    if (!action.canAffordSome) className += ' cnam';
    if (!action.canAfford) className += ' cna';

    const costClasses = action.costs.map(c => `res-${c.label}`).join(' ');
    const hasPopover = action.desc || action.effect || action.costs.length > 0;

    return (
        <Popover as="div" id={action.id} className={className} style={{ display: 'inline-block' }}>
                <PopoverButton
                    as="a"
                    className={`button is-dark ${costClasses}`}
                    onClick={callbacks.onClick}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                    role="link"
                >
                    <span className="aTitle">{action.title}</span>
                    {action.count !== undefined && action.count > 0 && (
                        <span className="count">{action.count}</span>
                    )}
                </PopoverButton>

            {hasPopover && hovered && (
                <PopoverPanel
                    static
                    anchor="bottom start"
                    className="popper"
                >
                    {action.desc && (
                        <div className="pop-desc-text">{action.desc}</div>
                    )}
                    {action.effect && (
                        <div className="pop-desc-effect has-text-info">{action.effect}</div>
                    )}
                    {action.costs.length > 0 && (
                        <div className="pop-desc-costs">
                            {action.costs.map(cost => (
                                <div key={cost.label} className={cost.affordable ? 'has-text-dark' : 'has-text-danger'}>
                                    {cost.label}: {cost.amount.toLocaleString()}
                                </div>
                            ))}
                        </div>
                    )}
                </PopoverPanel>
            )}
        </Popover>
    );
}

export function EvolutionTab({ actions }: EvolutionTabProps) {
    if (actions.length === 0) return null;

    return (
        <>
            {actions.map(({ action, callbacks }) => (
                <EvolutionAction
                    key={action.id}
                    action={action}
                    callbacks={callbacks}
                />
            ))}
        </>
    );
}
