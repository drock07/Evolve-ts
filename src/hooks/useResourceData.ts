/**
 * Temporary bridge hook that reads legacy global state and produces
 * props for the ResourcePanel component.
 *
 * This will be replaced once resources are managed by the new engine.
 */

import { useCallback } from 'react';
import { global, sizeApproximation, keyMultiplier, tmp_vars, breakdown } from '../vars';
import { loc } from '../locale';
import { legacy } from './legacyBridge';
import { useGameTick } from './useGameState';
import { ResourcePanelItem } from '../components/ResourcePanel';
import { ResourceRowData, ResourceRowCallbacks } from '../components/ResourceRow';

/** Resource order matching the original defineResources registration. */
function getResourceOrder(): string[] {
    const order: string[] = [];

    if (global.race.species === 'protoplasm') {
        order.push('RNA', 'DNA');
    }

    order.push(
        'Money', global.race.species, 'Slave', 'Authority', 'Mana', 'Energy', 'Sus',
        'Knowledge', 'Omniscience', 'Zen', 'Crates', 'Containers',
        'Food', 'Lumber', 'Chrysotile', 'Stone', 'Crystal', 'Useless',
        'Furs', 'Copper', 'Iron', 'Aluminium', 'Cement', 'Coal', 'Oil', 'Uranium',
        'Steel', 'Titanium', 'Alloy', 'Polymer', 'Iridium', 'Helium_3',
        'Water', 'Deuterium', 'Neutronium', 'Adamantite', 'Infernite', 'Elerium',
        'Nano_Tube', 'Graphene', 'Stanene', 'Bolognium', 'Vitreloy', 'Orichalcum',
        'Asphodel_Powder', 'Elysanite', 'Unobtainium', 'Materials', 'Horseshoe', 'Nanite',
        'Genes', 'Soul_Gem',
        'Plywood', 'Brick', 'Wrought_Iron', 'Sheet_Metal', 'Mythril', 'Aerogel',
        'Nanoweave', 'Scarletite', 'Quantium',
        'Corrupt_Gem', 'Codex', 'Cipher', 'Demonic_Essence', 'Blessed_Essence',
        'Blood_Stone', 'Artifact', 'Knockoff',
        'Plasmid', 'AntiPlasmid', 'Supercoiled', 'Phage', 'Dark', 'Harmony', 'AICore',
    );

    return order;
}

const PRESTIGE_RESOURCES = new Set([
    'Plasmid', 'AntiPlasmid', 'Supercoiled', 'Phage', 'Dark', 'Harmony', 'AICore',
]);

function getDiffColorClass(name: string, diff: number): string {
    if (global.race['decay']) {
        if (diff < 0) {
            const decayVal = breakdown?.p?.consume?.[name]?.[loc('evo_challenge_decay')] ?? 0;
            return diff >= decayVal ? 'has-text-warning' : 'has-text-danger';
        }
    } else if (name === global.race.species && global.race['fasting']) {
        if (diff >= 0 && diff < 0.75) return 'has-text-warning';
        if (diff < 0) return 'has-text-danger';
    } else if (diff < 0) {
        return 'has-text-danger';
    }
    return '';
}

function buildResourceData(name: string): ResourceRowData | null {
    // Prestige resources use global.prestige
    if (PRESTIGE_RESOURCES.has(name)) {
        const prestige = global.prestige[name];
        if (!prestige) return null;
        const meta = tmp_vars.resource?.[name];
        return {
            id: name,
            displayName: loc(`resource_${name}_name`),
            amount: prestige.count ? sizeApproximation(prestige.count, 3, false, true) : '0',
            max: null,
            diff: '0',
            color: meta?.color || 'special',
            display: !!prestige.count,
            isCrafted: false,
            isSpecial: true,
            stackable: false,
            cratesUnlocked: false,
            showRate: false,
            showCraft: false,
            showFasting: false,
            showBar: false,
            percentFull: 0,
            nearCap: false,
            diffColorClass: '',
        };
    }

    const res = global.resource[name];
    if (!res) return null;

    const meta = tmp_vars.resource?.[name];
    const color = meta?.color || 'info';
    const stackable = meta?.stackable || false;
    const isCrafted = res.max === -1;
    const isSpecial = res.max === -2;
    const displayName = res.name?.replace(/_/g, ' ') || name.replace(/_/g, ' ');

    const showRate = res.rate !== 0
        || (isCrafted && res.rate === 0 && global.race['no_craft'])
        || name === 'Scarletite' || name === 'Quantium';
    const showCraft = isCrafted && !global.race['no_craft']
        && name !== 'Scarletite' && name !== 'Quantium';
    const showFasting = !!(global.race['fasting'] && name === global.race.species);

    const barEnabled = res.bar && res.max > 0;
    const showBar = !!(global.settings.resBar[name] && !isCrafted && !isSpecial);
    const percentFull = barEnabled ? (res.amount / res.max) * 100 : 0;
    const nearCap = res.max > 0 && res.amount >= res.max * 0.99;

    return {
        id: name,
        displayName,
        amount: sizeApproximation(res.amount, isCrafted || isSpecial ? 2 : 0),
        max: res.max > 0 ? sizeApproximation(res.max, 0) : null,
        diff: sizeApproximation(res.diff, 2),
        color,
        display: !!res.display,
        isCrafted,
        isSpecial,
        stackable,
        cratesUnlocked: !!global.resource.Crates?.display,
        showRate,
        showCraft,
        showFasting,
        showBar,
        percentFull,
        nearCap,
        diffColorClass: getDiffColorClass(name, res.diff),
    };
}

export function useResourceData(): ResourcePanelItem[] {
    // Re-render on every game tick so we see updated amounts
    useGameTick();

    const order = getResourceOrder();
    const items: ResourcePanelItem[] = [];

    for (const name of order) {
        const data = buildResourceData(name);
        if (!data) continue;

        const callbacks: ResourceRowCallbacks = {
            onToggleBar: () => {
                global.settings.resBar[name] = !global.settings.resBar[name];
                global.resource[name].bar = global.settings.resBar[name];
            },
            onMouseOver: () => {
                $(`.res-${name}`).each(function () {
                    if (global.resource[name].amount >= $(this).attr(`data-${name}`)) {
                        $(this).addClass('hl-ca');
                    } else {
                        $(this).addClass('hl-cna');
                    }
                });
            },
            onMouseOut: () => {
                $(`.res-${name}`).each(function () {
                    $(this).removeClass('hl-ca');
                    $(this).removeClass('hl-cna');
                });
            },
        };

        // Craft callback only for craftable resources
        if (data.showCraft) {
            callbacks.onCraft = (vol: number | 'A') => {
                if (global.race['no_craft']) return;
                const craft_bonus = legacy.craftingRatio(name, 'manual').multiplier;
                const costs = legacy.craftCost(true);
                let volume = Math.floor(global.resource[costs[name][0].r].amount / costs[name][0].a);
                for (let i = 1; i < costs[name].length; i++) {
                    const temp = Math.floor(global.resource[costs[name][i].r].amount / costs[name][i].a);
                    if (temp < volume) volume = temp;
                }
                if (vol !== 'A') {
                    const total = vol * keyMultiplier();
                    if (total < volume) volume = total;
                }
                for (let i = 0; i < costs[name].length; i++) {
                    global.resource[costs[name][i].r].amount -= volume * costs[name][i].a;
                }
                global.resource[name].amount += volume * craft_bonus;
            };
        }

        items.push({ resource: data, callbacks });
    }

    return items;
}
