/**
 * Bridges engine state to the espionage modal.
 *
 * Every action closes the modal, which is why onAction reports back whether
 * the engine accepted it rather than closing unconditionally: a refused action
 * (the price went up, another action started on the same tick) should leave
 * the modal open rather than silently swallow the click.
 */

import { useCallback } from 'react';
import { global } from '../vars';
import { loc } from '../locale';
import { useGameTick } from './useGameState';
import { legacy } from './legacyBridge';
import { notifyStateChange } from '../state';
import { EspionageData, EspionageCallbacks, EspionageAction } from '../components/EspionageModal';

/**
 * The actions offered against `gov`, in the order drawEspModal listed them.
 *
 * Everything here is gated behind espionage tech and at least one spy in
 * place; the caller has already checked that the modal should open at all,
 * but the list is rebuilt on every tick and the conditions can lapse while
 * it is open.
 */
function availableActions(gov: number): EspionageAction[] {
    if (!(global.tech['spy'] && global.tech['spy'] >= 2)) return [];

    const foreign = global.civic.foreign[`gov${gov}`];
    if (!foreign || foreign.spy < 1) return [];

    const actions: EspionageAction[] = [
        { esp: 'influence', label: loc('civics_spy_influence') },
        { esp: 'sabotage', label: loc('civics_spy_sabotage') },
    ];

    // gov3 and gov4 are the truepath rivals; the three original powers are the
    // only ones these last three actions apply to.
    if (gov < 3) {
        actions.push({ esp: 'incite', label: loc('civics_spy_incite') });
    }
    if (legacy.annexOffered?.(gov)) {
        actions.push({ esp: 'annex', label: loc('civics_spy_annex') });
    }
    if (legacy.purchaseOffered?.(gov)) {
        actions.push({ esp: 'purchase', label: loc('civics_spy_purchase') });
    }

    return actions;
}

export function useEspionageData(gov: number): {
    data: EspionageData;
    callbacks: EspionageCallbacks;
    /** Runs the action and reports whether the engine accepted it. */
    runAction: (esp: string) => boolean;
} {
    useGameTick();

    const runAction = useCallback((esp: string): boolean => {
        let accepted: boolean;
        switch (esp) {
            case 'annex':
                accepted = !!legacy.espionageAnnex?.(gov);
                break;
            case 'purchase':
                accepted = !!legacy.espionagePurchase?.(gov);
                break;
            default: {
                // influence, sabotage and incite share one entry point, which
                // silently no-ops when its own guards fail. It reports nothing,
                // so the timer it would have set is what says whether it ran.
                // Compared against its previous value rather than against zero:
                // an action already running is exactly the case where spyAction
                // does nothing, and testing `> 0` would read that as success.
                const before = global.civic.foreign[`gov${gov}`]?.sab ?? 0;
                legacy.spyAction?.(esp, gov);
                accepted = (global.civic.foreign[`gov${gov}`]?.sab ?? 0) !== before;
                break;
            }
        }
        notifyStateChange();
        return accepted;
    }, [gov]);

    const onActionsRendered = useCallback(() => {
        legacy.registerEspPopovers?.(gov);
    }, [gov]);

    return {
        data: {
            title: loc('civics_espionage_actions'),
            actions: availableActions(gov),
        },
        // onAction is supplied by the component that owns the open state; this
        // keeps the hook free of it. See mountEspionage.
        callbacks: { onAction: () => {}, onActionsRendered },
        runAction,
    };
}
