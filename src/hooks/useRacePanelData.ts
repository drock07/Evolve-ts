/**
 * Temporary bridge hook for RacePanel data.
 * Reads from legacy global state and produces RacePanelData props.
 */

import { useGameTick } from './useGameState';
import { global } from '../vars';
import { loc } from '../locale';
import { RacePanelData } from '../components/RacePanel';
import { legacy } from './legacyBridge';

export function useRacePanelData(): RacePanelData {
    useGameTick();

    let name = '';
    if (global.race.species === 'protoplasm') {
        name = loc('race_protoplasm');
    } else if (legacy.flib) {
        name = legacy.flib('name');
    }

    return {
        name,
        morale: global.city?.morale?.current ?? null,
        power: global.city?.power ?? null,
        powerTotal: global.city?.power_total ?? null,
        showPower: !!global.city?.powered,
    };
}
