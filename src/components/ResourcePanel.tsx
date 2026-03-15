import { global, sizeApproximation, tmp_vars } from '../vars';
import { loc } from '../locale';
import { useGameTick } from '../hooks/useGameState';
import { ResourceRow } from './ResourceRow';

/** The ordered list of resource keys, matching the original defineResources registration order. */
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
    );

    // Special/prestige resources
    order.push(
        'Blood_Stone', 'Artifact', 'Knockoff',
        'Plasmid', 'AntiPlasmid', 'Supercoiled', 'Phage', 'Dark', 'Harmony', 'AICore',
    );

    return order;
}

/** Special prestige resources pull from global.prestige instead of global.resource */
const PRESTIGE_RESOURCES = new Set([
    'Plasmid', 'AntiPlasmid', 'Supercoiled', 'Phage', 'Dark', 'Harmony', 'AICore',
]);

function PrestigeRow({ name }: { name: string }) {
    const prestige = global.prestige[name];
    if (!prestige || !prestige.count) return null;

    const meta = tmp_vars.resource?.[name];
    const color = meta?.color || 'special';
    const displayCount = prestige.count ? sizeApproximation(prestige.count, 3, false, true) : 0;

    return (
        <div id={`res${name}`} className="resource">
            <div>
                <span className={`res has-text-${color}`}>{loc(`resource_${name}_name`)}</span>
                <span className="count">{displayCount}</span>
            </div>
        </div>
    );
}

export function ResourcePanel() {
    useGameTick();

    const order = getResourceOrder();

    return (
        <>
            <h2 className="is-sr-only">{loc('tab_resources')}</h2>
            {order.map(name => {
                if (PRESTIGE_RESOURCES.has(name)) {
                    return <PrestigeRow key={name} name={name} />;
                }
                if (!global.resource[name]) return null;
                return <ResourceRow key={name} name={name} />;
            })}
        </>
    );
}
