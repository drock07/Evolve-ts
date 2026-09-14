/**
 * Bridges engine state to the garrison.
 *
 * The legacy version expressed most of this as Vue filters, which were
 * evaluated against a bound slice of `global` on every re-render. They are
 * plain derivations here, computed once per tick in one place, which is also
 * the only way the two render targets can be guaranteed to agree.
 *
 * Two of them return markup rather than text — the stationed count and the
 * wounded count both substitute a seasonal easter egg — so those stay strings
 * and the component renders them as HTML, exactly as the filters did.
 */

import { useCallback } from 'react';
import { global, keyMultiplier } from '../vars';
import { traits } from '../races';
import { loc } from '../locale';
import { useGameTick } from './useGameState';
import { legacy } from './legacyBridge';
import { notifyStateChange } from '../state';
import { GarrisonData, GarrisonCallbacks, GarrisonCampaign } from '../components/Garrison';

/** Tactic index -> its localised name. Matches the legacy `tactics` filter. */
const TACTICS = ['ambush', 'raid', 'pillage', 'assault', 'siege'];

/** The hardest tactic; the arrows clamp here. */
const MAX_TACTIC = TACTICS.length - 1;

export function useGarrisonData(full: boolean): {
    data: GarrisonData;
    callbacks: GarrisonCallbacks;
} {
    useGameTick();

    const g = global.civic.garrison;
    const size = legacy.garrisonSize?.() ?? 0;
    const worldControlled = !!global.tech['world_control'] && !global.race['truepath'];

    const onHire = useCallback(() => {
        legacy.hireMerc?.();
        notifyStateChange();
    }, []);

    const onTacticUp = useCallback(() => {
        if (global.civic.garrison.tactic < MAX_TACTIC) {
            global.civic.garrison.tactic++;
        }
        notifyStateChange();
    }, []);

    const onTacticDown = useCallback(() => {
        if (global.civic.garrison.tactic > 0) {
            global.civic.garrison.tactic--;
        }
        notifyStateChange();
    }, []);

    // Both battalion arrows honour keyMultiplier, so shift/ctrl move the raid
    // size in larger steps — the same as every other stepped control.
    const onBattalionUp = useCallback(() => {
        const cap = legacy.garrisonSize?.() ?? 0;
        const garrison = global.civic.garrison;
        if (garrison.raid < cap) {
            garrison.raid = Math.min(garrison.raid + keyMultiplier(), cap);
        }
        notifyStateChange();
    }, []);

    const onBattalionDown = useCallback(() => {
        const garrison = global.civic.garrison;
        if (garrison.raid > 0) {
            garrison.raid = Math.max(garrison.raid - keyMultiplier(), 0);
        }
        notifyStateChange();
    }, []);

    const onCampaign = useCallback((gov: number) => {
        legacy.war_campaign?.(gov);
        notifyStateChange();
    }, []);

    /** One soldier's worth of rating; a hivemind counts as several. */
    const perSoldier = global.race['hivemind'] ? traits.hivemind.vars()[0] : 1;

    /**
     * The campaign launch buttons, in the order the legacy builder appended
     * them: the truepath rival first when it is visible, then the three
     * original powers, and none at all once the world is controlled.
     */
    function campaigns(): GarrisonCampaign[] {
        const out: GarrisonCampaign[] = [];
        const controlled = (gov: number) => {
            const f = global.civic.foreign[`gov${gov}`];
            return !!(f?.occ || f?.anx || f?.buy);
        };

        if (global.race['truepath'] && global.tech['rival'] && !global.tech['isolation']) {
            out.push({ gov: 3, title: legacy.govTitle?.(3) ?? '', controlled: false });
        }
        if (!global.tech['world_control']) {
            for (const gov of [0, 1, 2]) {
                out.push({ gov, title: legacy.govTitle?.(gov) ?? '', controlled: controlled(gov) });
            }
        }
        return out;
    }

    /**
     * Stationed and wounded counts, as markup.
     *
     * Both carry seasonal substitutions in the original filters — a trick on a
     * particular garrison size, an egg when nobody is wounded — and dropping
     * them would be a silent behaviour change, so they are reproduced rather
     * than simplified away.
     */
    function stationed(): string {
        const trickNum = global.race['cataclysm'] ? 13 : 31;
        if (size === trickNum && !full) {
            const trick = legacy.trickOrTreat?.(2, 14, true) ?? '';
            if (trick.length > 0) return trick;
        }
        return String(size);
    }

    function wounded(): string {
        const w = g.wounded;
        if (full && w === 0) {
            const egg = legacy.easterEgg?.(8, 12) ?? '';
            if (egg.length > 0) return egg;
        }
        return String(legacy.eventActive?.('fool', 2021) ? size - w : w);
    }

    function trainingTime(): string {
        return g.rate === 0
            ? legacy.timeFormat?.(-1)
            : legacy.timeFormat?.((100 - g.progress) / (g.rate * 4));
    }

    /**
     * The hover descriptions, by the key their trigger is known as.
     *
     * Functions rather than values: several are expensive (the army rating
     * breakdown walks every modifier) and all of them would otherwise be
     * recomputed on every tick for descriptions nobody is looking at. The
     * popover calls these only while open.
     *
     * They return HTML, as the legacy label() did — the breakdown is a table
     * of markup — so the popover renders them as such.
     */
    const describe = useCallback((key: string): string => {
        switch (key) {
            case 'tactic': {
                const tactic = TACTICS[global.civic.garrison.tactic] ?? TACTICS[0];
                if (tactic === 'siege') {
                    // Siege alone names the troops it ties up, and a federation
                    // ties up fewer.
                    const held = legacy.jobScale?.(
                        global.civic.govern.type === 'federation' ? 15 : 20,
                    );
                    return loc('civics_garrison_tactic_siege_desc', [held]);
                }
                return loc(`civics_garrison_tactic_${tactic}_desc`);
            }
            case 'bat':
                return loc('civics_garrison_army_label');
            case 'soldier':
                return legacy.describeSoldier?.() ?? '';
            case 'crew':
                return loc('civics_garrison_crew_desc');
            case 'wounded':
                return loc('civics_garrison_wounded_desc');
            case 'hmerc': {
                const cost = Math.round(legacy.mercCost?.() ?? 0).toLocaleString();
                return loc('civics_garrison_hire_mercenary_cost', [cost]);
            }
            case 'defenseRating':
                return loc('civics_garrison_defensive_rate');
            case 'offenseRating':
                return loc('civics_garrison_offensive_rate');
            case 'soldierRating':
                return legacy.soldierBreakdown?.('army') ?? '';
            default:
                return '';
        }
    }, []);

    const describeCampaign = useCallback(
        (gov: number): string => legacy.battleAssessment?.(gov) ?? '',
        [],
    );

    /**
     * The truepath rival's description, shown on its name rather than its
     * button — it explains who they are, not how a fight would go.
     */
    const describeRival = useCallback((): string => {
        const home = legacy.races?.[global.race.species]?.home ?? '';
        return loc('civics_gov_tp_rival', [legacy.govTitle?.(3) ?? '', home]);
    }, []);

    return {
        data: {
            describe,
            describeCampaign,
            describeRival,
            /** Prefixes the popover ids, keeping the two targets distinct. */
            popPrefix: full ? 'garrison' : 'cGarrison',
            display: !!g.display,
            title: loc('civics_garrison'),

            defenseLabel: loc('rating'),
            // The defensive rating is the whole garrison; the offensive one is
            // only the raiding party, and it is meaningless once there is
            // nobody left to raid.
            defenseRating: +(legacy.armyRating?.(size, 'army') ?? 0).toFixed(1),
            offenseRating: worldControlled
                ? null
                : +(legacy.armyRating?.(g.raid, 'army') ?? 0).toFixed(1),
            soldierRatingLabel: loc('civics_garrison_soldier_rating'),
            soldierRating: worldControlled
                ? +((legacy.armyRating?.(perSoldier, 'army', 0) ?? 0) / perSoldier).toFixed(1)
                : +(legacy.armyRating?.(perSoldier, 'army') ?? 0).toFixed(1),

            soldiersLabel: worldControlled
                ? loc('civics_garrison_peacekeepers')
                : loc('civics_garrison_soldiers'),
            stationed: stationed(),
            max: legacy.garrisonSize?.(true) ?? 0,
            crewLabel: loc('civics_garrison_crew'),
            crew: g.crew ?? 0,
            woundedLabel: loc('civics_garrison_wounded'),
            wounded: wounded(),

            showMercs: !!g.mercs && !global.tech['isolation'],
            hireLabel: loc('civics_garrison_hire_mercenary'),

            showCampaign: !!g.display
                && (!global.tech['world_control'] || !!global.race['truepath'])
                && !global.race['cataclysm']
                && !global.tech['isolation'],
            campaignLabel: loc('civics_garrison_campaign'),
            tacticName: loc(`civics_garrison_tactic_${TACTICS[g.tactic] ?? TACTICS[0]}`),
            battalionLabel: loc('civics_garrison_battalion'),
            raid: g.raid,

            training: full
                ? {
                    label: loc('civics_garrison_training'),
                    completeLabel: loc('arpa_to_complete'),
                    time: trainingTime(),
                    progress: g.progress,
                }
                : null,
            campaigns: campaigns(),
            launchLabel: loc('civics_garrison_launch_campaign'),
            withdrawLabel: loc('civics_garrison_deoccupy'),
        },
        callbacks: {
            onHire, onTacticUp, onTacticDown,
            onBattalionUp, onBattalionDown, onCampaign,
        },
    };
}
