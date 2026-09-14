/**
 * Bridges engine state to the government selector.
 *
 * Which governments can be switched to is a direct translation of the chain of
 * conditions in drawGovModal: each is gated on its own tech, never offers the
 * government already in force, and most are unavailable to warlord runs.
 */

import { useCallback } from 'react';
import { global } from '../vars';
import { loc } from '../locale';
import { useGameTick } from './useGameState';
import { legacy } from './legacyBridge';
import { notifyStateChange } from '../state';
import { GovernmentData, GovernmentCallbacks, GovernmentOption } from '../components/GovernmentSelector';

/** Localised government name, with the evil-universe rename for democracy. */
function govName(type: string): string {
    if (global.race.universe === 'evil' && type === 'democracy') {
        return loc('govern_managed_democracy');
    }
    return loc(`govern_${type}`);
}

/**
 * The switchable governments, in the order drawGovModal listed them.
 *
 * `warlord` blocks everything except autocracy and magocracy, which is why
 * most entries carry that condition.
 */
function availableGovernments(): GovernmentOption[] {
    if (!global.tech['govern']) return [];

    const current = global.civic.govern.type;
    const warlord = !!global.race['warlord'];
    const wishGov = !!(global.race['wish'] && global.race['wishStats'] && (global.race as any).wishStats?.gov);

    const candidates: Array<[string, boolean]> = [
        ['autocracy', true],
        ['democracy', !warlord],
        ['oligarchy', !warlord],
        ['theocracy', !!global.tech['gov_theo'] && !warlord],
        ['republic', global.tech['govern'] >= 2 && !warlord],
        ['socialist', !!global.tech['gov_soc'] && !warlord],
        ['corpocracy', !!global.tech['gov_corp'] && !warlord],
        ['technocracy', global.tech['govern'] >= 3 && !warlord],
        ['federation', !!global.tech['gov_fed'] && !warlord],
        ['magocracy', !!global.tech['gov_mage']],
        ['dictator', wishGov],
    ];

    return candidates
        .filter(([gov, unlocked]) => unlocked && gov !== current)
        .map(([gov]) => ({ gov, label: govName(gov) }));
}

export function useGovernmentData(): { data: GovernmentData; callbacks: GovernmentCallbacks } {
    useGameTick();

    const govern = global.civic.govern;

    const onSelect = useCallback((gov: string) => {
        legacy.setGovernment?.(gov);
        notifyStateChange();
    }, []);

    const onOptionsRendered = useCallback(() => {
        legacy.registerGovPopovers?.();
    }, []);

    // Computed on hover rather than per tick: both read engine state that the
    // description is only worth deriving when someone is looking at it.
    const currentDescription = useCallback(
        (): string => legacy.describeCurrentGovernment?.() ?? '',
        [],
    );

    const changeDescription = useCallback((): string => {
        const rev = global.civic.govern?.rev ?? 0;
        return rev > 0
            ? loc('civics_change_desc', [rev])
            : loc('civics_change_desc2');
    }, []);

    return {
        data: {
            display: !!global.tech['govern'],
            // Same key as the modal heading; the original used it for both.
            prefix: loc('civics_government_type'),
            current: govName(govern?.type ?? 'anarchy'),
            // From anarchy there is nothing to revolt against, so it reads as
            // simply choosing a government.
            buttonLabel: govern?.type === 'anarchy'
                ? loc('civics_set_gov')
                : loc('civics_revolution'),
            disabled: (govern?.rev ?? 0) > 0,
            modalTitle: loc('civics_government_type'),
            options: availableGovernments(),
            currentDescription,
            changeDescription,
        },
        callbacks: { onSelect, onOptionsRendered },
    };
}
