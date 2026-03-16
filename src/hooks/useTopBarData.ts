/**
 * Temporary bridge hook for TopBar data.
 * Reads from legacy global state and produces TopBarData props.
 */

import { useGameTick } from './useGameState';
import { global } from '../vars';
import { loc } from '../locale';
import { TopBarData, TopBarCallbacks } from '../components/TopBar';
import { legacy } from './legacyBridge';

export function useTopBarData(): { data: TopBarData; callbacks: TopBarCallbacks } {
    useGameTick();

    const races = legacy.races;
    const species = global.race.species;

    // Planet name
    let planetName = '';
    if (species === 'protoplasm') {
        planetName = loc('race_protoplasm');
    } else if (races && races[species]) {
        planetName = races[species].home;
    }

    // Universe name
    let universeName: string | null = null;
    if (global.race.universe && global.race.universe !== 'standard' && global.race.universe !== 'bigbang') {
        const universeTypes = legacy.universe_types;
        if (universeTypes && universeTypes[global.race.universe]) {
            universeName = universeTypes[global.race.universe].name;
        }
    }

    // Calendar
    let calendar = null;
    if (global.city?.calendar?.day > 0) {
        const seasonDesc = legacy.seasonDesc;
        calendar = {
            year: global.city.calendar.year,
            day: global.city.calendar.day,
            season: seasonDesc ? seasonDesc('season') : '',
            weather: seasonDesc ? seasonDesc('weather') : '',
            temp: seasonDesc ? seasonDesc('temp') : '',
            moon: seasonDesc ? seasonDesc('moon') : '',
            astroSign: seasonDesc ? seasonDesc('astrology') : '',
            astroSignLabel: seasonDesc ? seasonDesc('sign') : '',
        };
    }

    // Version
    let version = `v${global.version || ''}`;
    if (global['beta']) {
        const revision = global['revision'] || '';
        version = `v${global.version} Beta ${global['beta']}${revision}`;
    } else {
        const revision = global['revision'] || '';
        version = `v${global.version}${revision}`;
    }

    // Accelerated time
    let acceleratedTime: string | null = null;
    if (global.settings.at > 0) {
        const loopTimers = legacy.loopTimers;
        if (loopTimers) {
            const minutes = Math.ceil((global.settings.at * loopTimers().longTimer) / 60000);
            if (minutes > 0) {
                const hours = Math.floor(minutes / 60);
                const mins = minutes - hours * 60;
                acceleratedTime = `${hours}:${mins.toString().padStart(2, '0')}`;
            }
        }
    }

    // Info timer (orbit decay)
    let infoTimer: string | null = null;
    if (global.race['orbit_decay'] && !global.race['orbit_decayed']) {
        infoTimer = `T-${global.race['orbit_decay'] - global.stats.days}`;
    }

    const data: TopBarData = {
        planetName,
        universeName,
        isSimulation: !!global['sim'],
        showPet: !!global.race['pet'],
        calendar,
        isPaused: !!global.settings.pause,
        version,
        infoTimer,
        acceleratedTime,
    };

    const callbacks: TopBarCallbacks = {
        onPause: () => {
            if (global.settings.pause) {
                global.settings.pause = false;
                if (!legacy.webWorkerS?.() && legacy.gameLoop) {
                    legacy.gameLoop('start');
                }
            } else {
                global.settings.pause = true;
            }
        },
    };

    return { data, callbacks };
}
