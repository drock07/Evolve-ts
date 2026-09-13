/**
 * Bridges engine state to the MAD control.
 *
 * `armed: false` means live. Every label and flag below reads inverted for
 * that reason — see CivicFixed.mad in types/state.ts.
 */

import { useCallback } from 'react';
import { global } from '../vars';
import { loc } from '../locale';
import { useGameTick } from './useGameState';
import { legacy } from './legacyBridge';
import { notifyStateChange } from '../state';
import { MadControlData, MadControlCallbacks } from '../components/MadControl';

/**
 * Two species use grenades rather than missiles in their flavour text. The
 * original computed this once when building the markup; recomputing per render
 * keeps it correct if the species changes under a running page.
 */
function usesAltText(): boolean {
    const hrt = global.race['hrt'];
    return !!hrt && ['wolven', 'vulpine'].includes(hrt as unknown as string);
}

export function useMadData(): { data: MadControlData; callbacks: MadControlCallbacks } {
    useGameTick();

    const mad = global.civic.mad;
    const armed = !!mad?.armed;
    const alt = usesAltText();

    const plasmidType = global.race.universe === 'antimatter'
        ? loc('resource_AntiPlasmid_plural_name')
        : loc('resource_Plasmid_plural_name');

    const onArm = useCallback(() => {
        legacy.madArm?.();
        notifyStateChange();
    }, []);

    const onLaunch = useCallback(() => {
        legacy.madLaunch?.();
        notifyStateChange();
    }, []);

    return {
        data: {
            display: !!mad?.display,
            armed,
            warning: loc('civics_mad_reset_desc', [plasmidType]),
            // Safe -> offer to arm; live -> offer to disarm.
            armLabel: armed
                ? loc(alt ? 'civics_mad_arm_grenades' : 'civics_mad_arm_missiles')
                : loc(alt ? 'civics_mad_disarm_grenades' : 'civics_mad_disarm_missiles'),
            launchLabel: loc(alt ? 'civics_mad_launch_grenades' : 'civics_mad_launch_missiles'),
        },
        callbacks: { onArm, onLaunch },
    };
}
