import { useRef, useEffect, useCallback } from 'react';
import { global, sizeApproximation, keyMultiplier, tmp_vars, breakdown } from '../vars';
import { loc } from '../locale';

// Late-bound references set by mountResourcePanel before first render.
// This avoids circular dependency issues from static imports.
export const deps = {
    craftCost: null as any,
    craftingRatio: null as any,
    breakdownPopover: null as any,
    craftingPopover: null as any,
    popover: null as any,
    eventActive: null as any,
};

interface ResourceRowProps {
    name: string;
}

export function ResourceRow({ name }: ResourceRowProps) {
    const res = global.resource[name];
    const meta = tmp_vars.resource?.[name];
    const rowRef = useRef<HTMLDivElement>(null);
    const display = res && res.display;

    // All hooks must be called unconditionally (Rules of Hooks).
    // Bar toggle
    const handleToggle = useCallback(() => {
        global.settings.resBar[name] = !global.settings.resBar[name];
        global.resource[name].bar = global.settings.resBar[name];
    }, [name]);

    // Craft handler
    const handleCraft = useCallback((vol: number | 'A') => {
        if (global.race['no_craft']) return;
        const craft_bonus = deps.craftingRatio(name, 'manual').multiplier;
        const craft_costs = deps.craftCost(true);
        let volume = Math.floor(global.resource[craft_costs[name][0].r].amount / craft_costs[name][0].a);
        for (let i = 1; i < craft_costs[name].length; i++) {
            const temp = Math.floor(global.resource[craft_costs[name][i].r].amount / craft_costs[name][i].a);
            if (temp < volume) volume = temp;
        }
        if (vol !== 'A') {
            const total = vol * keyMultiplier();
            if (total < volume) volume = total;
        }
        for (let i = 0; i < craft_costs[name].length; i++) {
            global.resource[craft_costs[name][i].r].amount -= volume * craft_costs[name][i].a;
        }
        global.resource[name].amount += volume * craft_bonus;
    }, [name]);

    // Highlight on hover
    const handleMouseOver = useCallback(() => {
        $(`.res-${name}`).each(function () {
            if (global.resource[name].amount >= $(this).attr(`data-${name}`)) {
                $(this).addClass('hl-ca');
            } else {
                $(this).addClass('hl-cna');
            }
        });
    }, [name]);

    const handleMouseOut = useCallback(() => {
        $(`.res-${name}`).each(function () {
            $(this).removeClass('hl-ca');
            $(this).removeClass('hl-cna');
        });
    }, [name]);

    // Attach popovers after mount — only when display becomes true
    useEffect(() => {
        if (!display) return;

        const isCrafted = res.max === -1;
        const isSpecialCrafted = res.max === -2;
        const stackable = meta?.stackable || false;
        const showCraft = isCrafted && !global.race['no_craft'] && name !== 'Scarletite' && name !== 'Quantium';

        // Amount breakdown popover
        deps.breakdownPopover(`cnt${name}`, name, 'c');

        // Rate/craft popovers
        if (showCraft) {
            const inc = [1, 5, 'A'];
            for (let i = 0; i < inc.length; i++) {
                const extra = function () {
                    const popper = $(`<div></div>`);
                    const vol = inc[i];
                    const bonus = +(deps.craftingRatio(name, 'manual').multiplier * 100).toFixed(0);
                    popper.append($(`<div class="has-text-info">${loc('manual_crafting_hover_bonus', [bonus.toLocaleString(), global.resource[name].name])}</div>`));
                    const craft_costs_data = deps.craftCost(true);
                    const crafts = $(`<div><span class="has-text-success">${loc('manual_crafting_hover_craft')} </span></div>`);
                    let num_crafted = 0;
                    if (typeof vol !== 'number') {
                        num_crafted = global.resource[craft_costs_data[name][0].r].amount / craft_costs_data[name][0].a;
                        if (craft_costs_data[name].length > 1) {
                            for (let j = 1; j < craft_costs_data[name].length; j++) {
                                const curr_max = global.resource[craft_costs_data[name][j].r].amount / craft_costs_data[name][j].a;
                                if (curr_max < num_crafted) num_crafted = curr_max;
                            }
                        }
                        crafts.append($(`<span class="has-text-advanced">${sizeApproximation((bonus / 100) * num_crafted, 1)} ${global.resource[name].name}</span>`));
                    } else {
                        num_crafted = keyMultiplier() * vol;
                        const total_crafted = sizeApproximation((bonus / 100) * num_crafted, 1);
                        crafts.append($(`<span class="has-text-advanced"><span class="craft" data-val="${(sizeApproximation((bonus / 100) * vol))}">${total_crafted}</span> ${global.resource[name].name}</span>`));
                    }
                    const costs = $(`<div><span class="has-text-danger">${loc('manual_crafting_hover_use')} </span></div>`);
                    for (let j = 0; j < craft_costs_data[name].length; j++) {
                        costs.append($(`<span class="craft-elm has-text-caution">${sizeApproximation(num_crafted * craft_costs_data[name][j].a, 1)} ${global.resource[craft_costs_data[name][j].r].name}</span>`));
                        if (j + 1 < craft_costs_data[name].length) {
                            costs.append($(`<span>, </span>`));
                        }
                    }
                    popper.append(crafts);
                    popper.append(costs);
                    return popper;
                };
                deps.craftingPopover(`inc${name}${inc[i]}`, name, 'manual', extra);
            }
        }

        if (stackable) {
            deps.popover(`con${name}`, function () {
                const popper = $(`<div>${loc('resource_Crates_plural')} ${global.resource[name].crates}</div>`);
                if (global.tech['steel_container']) {
                    popper.append($(`<div>${loc('resource_Containers_plural')} ${global.resource[name].containers}</div>`));
                }
                return popper;
            });
        }

        if ((name !== global.race.species || global.race['fasting']) && name !== 'Crates' && name !== 'Containers' && !isCrafted && !isSpecialCrafted) {
            deps.breakdownPopover(`inc${name}`, name, 'p');
        } else if (isCrafted) {
            deps.craftingPopover(`inc${name}`, name, 'auto');
        }
    }, [name, display]);

    // Early return AFTER all hooks
    if (!display) {
        return null;
    }

    const color = meta?.color || 'info';
    const stackable = meta?.stackable || false;
    const isCrafted = res.max === -1;
    const isSpecialCrafted = res.max === -2;
    const displayName = res.name?.replace(/_/g, ' ') || name.replace(/_/g, ' ');

    // Format values
    const amount = sizeApproximation(res.amount, isCrafted || isSpecialCrafted ? 2 : 0);
    const max = res.max > 0 ? sizeApproximation(res.max, 0) : null;
    const diff = sizeApproximation(res.diff, 2);
    const showRate = res.rate !== 0 || (isCrafted && res.rate === 0 && global.race['no_craft']) || name === 'Scarletite' || name === 'Quantium';
    const showCraft = isCrafted && !global.race['no_craft'] && name !== 'Scarletite' && name !== 'Quantium';
    const showFasting = global.race['fasting'] && name === global.race.species;

    // Bar percentage
    const barEnabled = res.bar && res.max > 0;
    const percentFull = barEnabled ? (res.amount / res.max) * 100 : 0;
    const showBar = global.settings.resBar[name] && !isCrafted && !isSpecialCrafted;

    // Warning/capacity state
    const nearCap = res.max > 0 && res.amount >= res.max * 0.99;

    // Diff color
    let diffColorClass = '';
    if (global.race['decay']) {
        if (res.diff < 0) {
            const decayBreakdown = global.resource[name].diff >= (breakdown?.p?.consume?.[name]?.[loc('evo_challenge_decay')] ?? 0);
            diffColorClass = decayBreakdown ? 'has-text-warning' : 'has-text-danger';
        }
    } else if (name === global.race.species && global.race['fasting']) {
        if (res.diff >= 0 && res.diff < 0.75) {
            diffColorClass = 'has-text-warning';
        } else if (res.diff < 0) {
            diffColorClass = 'has-text-danger';
        }
    } else if (res.diff < 0) {
        diffColorClass = 'has-text-danger';
    }

    // Horseshoe April Fools override
    let displayAmount = amount;
    if (name === 'Horseshoe' && !global.race['hooved'] && deps.eventActive('fool', 2023)) {
        displayAmount = sizeApproximation(5, 2);
    }

    const containerClasses = [
        'resource',
        isCrafted || isSpecialCrafted ? 'crafted' : '',
        showBar ? 'showBar' : '',
    ].filter(Boolean).join(' ');

    const style = showBar && barEnabled
        ? { '--percent-full': `${percentFull}%` } as React.CSSProperties
        : undefined;

    return (
        <div
            id={`res${name}`}
            className={containerClasses}
            style={style}
            ref={rowRef}
            onMouseOver={handleMouseOver}
            onMouseOut={handleMouseOut}
        >
            <div>
                <h3
                    className={`res has-text-${color}${!isCrafted && !isSpecialCrafted ? ' bar' : ''}`}
                    onClick={!isCrafted && !isSpecialCrafted ? handleToggle : undefined}
                >
                    {displayName}
                </h3>
                <span id={`cnt${name}`} className={`count${nearCap ? ' has-text-warning' : ''}`}>
                    {isCrafted || isSpecialCrafted
                        ? displayAmount
                        : `${amount} / ${max}`
                    }
                </span>
            </div>

            {stackable && (
                <span>
                    {global.resource.Crates.display && (
                        <span
                            id={`con${name}`}
                            className="interact has-text-success"
                            role="button"
                            aria-label={`Open crate management for ${displayName}`}
                        >
                            +
                        </span>
                    )}
                </span>
            )}
            {!stackable && !showCraft && <span></span>}

            {showRate && (
                <span
                    id={`inc${name}`}
                    className={`diff ${diffColorClass}`}
                    aria-label={`${displayName} ${diff} per second`}
                >
                    {diff} /s
                </span>
            )}

            {showFasting && !showRate && (
                <span
                    id={`inc${name}`}
                    className={`diff ${diffColorClass}`}
                    aria-label={`${displayName} ${diff}`}
                >
                    {diff}
                </span>
            )}

            {showCraft && (
                <span className="craftable">
                    {[1, 5].map(vol => (
                        <span id={`inc${name}${vol}`} key={vol}>
                            <a
                                onClick={() => handleCraft(vol)}
                                aria-label={`craft ${vol} ${displayName}`}
                                role="button"
                            >
                                +<span className="craft" data-val={vol}>{vol}</span>
                            </a>
                        </span>
                    ))}
                    <span id={`inc${name}A`}>
                        <a
                            onClick={() => handleCraft('A')}
                            aria-label={`craft max ${displayName}`}
                            role="button"
                        >
                            +<span className="craft" data-val="A">A</span>
                        </a>
                    </span>
                </span>
            )}

            {!showRate && !showFasting && !showCraft && !stackable && <span></span>}
        </div>
    );
}
