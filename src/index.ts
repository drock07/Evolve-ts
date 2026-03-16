import { global, tmp_vars, save, webWorker } from './vars';
import { loc } from './locale';
import { setupStats } from './achieve';
import { vBind, clearElement, flib, tagEvent, gameLoop, popover, clearPopper, powerGrid } from './functions';
import { tradeRatio, atomic_mass, supplyValue, marketItem, containerItem, loadEjector, loadSupply, loadAlchemy, initResourceTabs, drawResourceTab, tradeSummery } from './resources';
import { defineJobs, } from './jobs';
import { clearSpyopDrag } from './governor';
import { defineIndustry, setPowerGrid, gridDefs, clearGrids } from './industry';
import { defineGovernment, defineGarrison, buildGarrison, commisionGarrison, foreignGov } from './civics';
import { races, shapeShift, renderPsychicPowers, renderSupernatural } from './races';
import { drawEvolution, drawCity, drawTech, resQueue, clearResDrag } from './actions';
import { renderSpace, ascendLab, terraformLab } from './space';
import { renderFortress, buildFortress, drawMechLab, clearMechDrag, drawHellObservations } from './portal';
import { renderEdenic } from './edenic';
import { drawShipYard, clearShipDrag, renderTauCeti } from './truepath';
import { arpa, clearGeneticsDrag } from './arpa';

function tabLabel(lbl){
    switch (lbl){
        case 'city':
            if (global.resource[global.race.species]){
                if (global.resource[global.race.species].amount <= 5){
                    return loc('tab_city1');
                }
                else if (global.resource[global.race.species].amount <= 20){
                    return loc('tab_city2');
                }
                else if (global.resource[global.race.species].amount <= 75){
                    return loc('tab_city3');
                }
                else if (global.resource[global.race.species].amount <= 250){
                    return loc('tab_city4');
                }
                else if (global.resource[global.race.species].amount <= 600){
                    return loc('tab_city5');
                }
                else if (global.resource[global.race.species].amount <= 1200){
                    return loc('tab_city6');
                }
                else if (global.resource[global.race.species].amount <= 2500){
                    return loc('tab_city7');
                }
                else {
                    return loc('tab_city8');
                }
            }
            else {
                return loc('tab_city1');
            }
        case 'local_space':
            return loc('sol_system',[global.race['truepath'] ? races[global.race.species].home : flib('name')]);
        case 'outer_local_space':
            return loc('outer_sol_system',[global.race['truepath'] ? races[global.race.species].home : flib('name')])
        case 'old':
            return loc('tab_old_res');
        case 'new':
            return loc('tab_new_res');
        case 'old_sr':
            return loc('tab_old_sr_res');
        case 'new_sr':
            return loc('tab_new_sr_res');
        case 'tab_mech':
            return global.race['warlord'] ? loc('tab_artificer')  : loc(lbl);
        default:
            return loc(lbl);
    }
}

function updateQueueStyle(){
    const buildingQueue = $('#buildQueue');
    ['standardqueuestyle', 'listqueuestyle', 'bulletlistqueuestyle', 'numberedlistqueuestyle']
        .forEach(qstyle => {
            if (global.settings.queuestyle === qstyle) {
                buildingQueue.addClass(qstyle);
            } else {
                buildingQueue.removeClass(qstyle);
            }
        });
}

export function initTabs(){
    if (global.settings.tabLoad){
        loadTab(`mTabCivil`);
        loadTab(`mTabCivic`);
        loadTab(`mTabResearch`);
        loadTab(`mTabResource`);
        loadTab(`mTabArpa`);
        loadTab(`mTabStats`);
        loadTab(`mTabObserve`);
    }
    else {
        loadTab(global.settings.civTabs);
    }
}

export function loadTab(tab){
    if (!global.settings.tabLoad){
        clearResDrag();
        clearGrids();
        clearMechDrag();
        clearGeneticsDrag();
        clearSpyopDrag();
        clearShipDrag();
        clearElement($(`#mTabCivil`));
        clearElement($(`#mTabCivic`));
        clearElement($(`#mTabResearch`));
        clearElement($(`#mTabResource`));
        clearElement($(`#mTabArpa`));
        clearElement($(`#mTabStats`));
        clearElement($(`#mTabObserve`));
    }
    else {
        tagEvent('page_view',{ page_title: `Evolve - All Tabs` });
    }
    switch (tab){
        case 0:
            if (!global.settings.tabLoad){
                tagEvent('page_view',{ page_title: `Evolve - Evolution` });
                drawEvolution();
            }
            break;
        case 1:
        case 'mTabCivil':
            {
                if (!global.settings.tabLoad){
                    tagEvent('page_view',{ page_title: `Evolve - Civilization` });
                }
                $(`#mTabCivil`).append(`<b-tabs class="resTabs" v-model="s.spaceTabs" :animated="s.animated" @input="swapTab">
                    <b-tab-item id="city" :visible="s.showCity">
                        <template slot="header">
                            <h2 class="is-sr-only">{{ 'city' | label }}</h2>
                            <span aria-hidden="true">{{ 'city' | label }}</span>
                        </template>
                    </b-tab-item>
                    <b-tab-item id="space" :visible="s.showSpace">
                        <template slot="header">
                            <h2 class="is-sr-only">{{ 'local_space' | label }}</h2>
                            <span aria-hidden="true">{{ 'local_space' | label }}</span>
                        </template>
                    </b-tab-item>
                    <b-tab-item id="interstellar" :visible="s.showDeep">
                        <template slot="header">
                            <h2 class="is-sr-only">{{ 'tab_interstellar' | label }}</h2>
                            <span aria-hidden="true">{{ 'tab_interstellar' | label }}</span>
                        </template>
                    </b-tab-item>
                    <b-tab-item id="galaxy" :visible="s.showGalactic">
                        <template slot="header">
                            <h2 class="is-sr-only">{{ 'tab_galactic' | label }}</h2>
                            <span aria-hidden="true">{{ 'tab_galactic' | label }}</span>
                        </template>
                    </b-tab-item>
                    <b-tab-item id="portal" :visible="s.showPortal">
                        <template slot="header">
                            <h2 class="is-sr-only">{{ 'tab_portal' | label }}</h2>
                            <span aria-hidden="true">{{ 'tab_portal' | label }}</span>
                        </template>
                    </b-tab-item>
                    <b-tab-item id="outerSol" :visible="s.showOuter">
                        <template slot="header">
                            <h2 class="is-sr-only">{{ 'outer_local_space' | label }}</h2>
                            <span aria-hidden="true">{{ 'outer_local_space' | label }}</span>
                        </template>
                    </b-tab-item>
                    <b-tab-item id="tauceti" :visible="s.showTau">
                        <template slot="header">
                            <h2 class="is-sr-only">{{ 'tab_tauceti' | label }}</h2>
                            <span aria-hidden="true">{{ 'tab_tauceti' | label }}</span>
                        </template>
                    </b-tab-item>
                    <b-tab-item id="eden" :visible="s.showEden">
                        <template slot="header">
                            <h2 class="is-sr-only">{{ 'tab_eden' | label }}</h2>
                            <span aria-hidden="true">{{ 'tab_eden' | label }}</span>
                        </template>
                    </b-tab-item>
                </b-tabs>`);
                vBind({
                    el: `#mTabCivil`,
                    data: {
                        s: global.settings
                    },
                    methods: {
                        swapTab(tab){
                            if (!global.settings.tabLoad){
                                clearElement($(`#city`));
                                clearElement($(`#space`));
                                clearElement($(`#interstellar`));
                                clearElement($(`#galaxy`));
                                clearElement($(`#portal`));
                                clearElement($(`#outerSol`));
                                clearElement($(`#tauCeti`));
                                clearElement($(`#eden`));
                                switch (tab){
                                    case 0:
                                        drawCity();
                                        break;
                                    case 1:
                                    case 2:
                                    case 3:
                                    case 5:
                                        renderSpace();
                                        break;
                                    case 4:
                                        renderFortress();
                                        break;
                                    case 6:
                                        renderTauCeti();
                                        break;
                                    case 7:
                                        renderEdenic();
                                        break;
                                }
                            }
                            return tab;
                        }
                    },
                    filters: {
                        label(lbl){
                            return tabLabel(lbl);
                        }
                    }
                });
                if (global.race.species !== 'protoplasm'){
                    drawCity();
                    renderSpace();
                    renderFortress();
                    renderTauCeti();
                    renderEdenic();
                }
                if (global.race['noexport']){
                    if (global.race['noexport'] === 'Race'){
                        clearElement($(`#city`));
                        ascendLab();
                    }
                    else if (global.race['noexport'] === 'Hybrid'){
                        clearElement($(`#city`));
                        ascendLab(true);
                    }
                    else if (global.race['noexport'] === 'Planet'){
                        clearElement($(`#city`));
                        terraformLab();
                    }
                }
            }
            break;
        case 2:
        case 'mTabCivic':
            {
                if (!global.settings.tabLoad){
                    tagEvent('page_view',{ page_title: `Evolve - Civics` });
                }
                $(`#mTabCivic`).append(`<b-tabs class="resTabs" v-model="s.govTabs" :animated="s.animated" @input="swapTab">
                    <b-tab-item id="civic">
                        <template slot="header">
                            <h2 class="is-sr-only">{{ 'tab_gov' | label }}</h2>
                            <span aria-hidden="true">{{ 'tab_gov' | label }}</span>
                        </template>
                    </b-tab-item>
                    <b-tab-item id="industry" class="industryTab" :visible="s.showIndustry">
                        <template slot="header">
                            <h2 class="is-sr-only">{{ 'tab_industry' | label }}</h2>
                            <span aria-hidden="true">{{ 'tab_industry' | label }}</span>
                        </template>
                    </b-tab-item>
                    <b-tab-item id="powerGrid" class="powerGridTab" :visible="s.showPowerGrid">
                        <template slot="header">
                            <h2 class="is-sr-only">{{ 'tab_power_grid' | label }}</h2>
                            <span aria-hidden="true">{{ 'tab_power_grid' | label }}</span>
                        </template>
                    </b-tab-item>
                    <b-tab-item id="military" class="militaryTab" :visible="s.showMil">
                        <template slot="header">
                            <h2 class="is-sr-only">{{ 'tab_military' | label }}</h2>
                            <span aria-hidden="true">{{ 'tab_military' | label }}</span>
                        </template>
                    </b-tab-item>
                    <b-tab-item id="mechLab" class="mechTab" :visible="s.showMechLab">
                        <template slot="header">
                            <h2 class="is-sr-only">{{ 'tab_mech' | label }}</h2>
                            <span aria-hidden="true">{{ 'tab_mech' | label }}</span>
                        </template>
                    </b-tab-item>
                    <b-tab-item id="dwarfShipYard" class="ShipYardTab" :visible="s.showShipYard">
                        <template slot="header">
                            <h2 class="is-sr-only">{{ 'tab_shipyard' | label }}</h2>
                            <span aria-hidden="true">{{ 'tab_shipyard' | label }}</span>
                        </template>
                    </b-tab-item>
                    <b-tab-item id="psychicPowers" class="psychicTab" :visible="s.showPsychic">
                        <template slot="header">
                            <h2 class="is-sr-only">{{ 'tab_psychic' | label }}</h2>
                            <span aria-hidden="true">{{ 'tab_psychic' | label }}</span>
                        </template>
                    </b-tab-item>
                    <b-tab-item id="supernatural" class="supernaturalTab" :visible="s.showWish">
                        <template slot="header">
                            <h2 class="is-sr-only">{{ 'tab_supernatural' | label }}</h2>
                            <span aria-hidden="true">{{ 'tab_supernatural' | label }}</span>
                        </template>
                    </b-tab-item>
                </b-tabs>`);
                vBind({
                    el: `#mTabCivic`,
                    data: {
                        s: global.settings
                    },
                    methods: {
                        swapTab(tab){
                            if (!global.settings.tabLoad){
                                clearGrids();
                                clearSpyopDrag();
                                clearMechDrag();
                                clearShipDrag();
                                clearElement($(`#civic`));
                                clearElement($(`#industry`));
                                clearElement($(`#powerGrid`));
                                clearElement($(`#military`));
                                clearElement($(`#mechLab`));
                                clearElement($(`#dwarfShipYard`));
                                clearElement($(`#psychicPowers`));
                                clearElement($(`#supernatural`));
                                switch (tab){
                                    case 0:
                                        {
                                            $('#civic').append($('<div id="civics" class="tile is-parent"></div>'));
                                            defineJobs();
                                            $('#civics').append($('<div id="r_civics" class="tile is-vertical is-parent civics"></div>'));
                                            defineGovernment();
                                            if (global.race.species !== 'protoplasm' && !global.race['start_cataclysm']){
                                                commisionGarrison();
                                                buildGarrison($('#c_garrison'),false);
                                                foreignGov();
                                            }
                                            if (global.race['shapeshifter']){
                                                shapeShift(false,true);
                                            }
                                        }
                                        break;
                                    case 1:
                                        defineIndustry();
                                        break;
                                    case 2:
                                        {
                                            Object.keys(gridDefs()).forEach(function(gridtype){
                                                powerGrid(gridtype);
                                            });
                                            setPowerGrid();
                                        }
                                        break;
                                    case 3:
                                        if (global.race.species !== 'protoplasm' && !global.race['start_cataclysm']){
                                            defineGarrison();
                                            if (!global.race['warlord']){
                                                buildFortress($('#fortress'),false);
                                            }
                                        }
                                        break;
                                    case 4:
                                        if (global.race.species !== 'protoplasm' && !global.race['start_cataclysm']){
                                            drawMechLab();
                                        }
                                        break;
                                    case 5:
                                        if (global.race['truepath'] && global.race.species !== 'protoplasm' && !global.race['start_cataclysm']){
                                            drawShipYard();
                                        }
                                        break;
                                    case 6:
                                        if (global.race['psychic'] && global.tech['psychic'] && global.race.species !== 'protoplasm'){
                                            renderPsychicPowers();
                                        }
                                        break;
                                    case 7:
                                        if (((global.race['wish'] && global.tech['wish']) || global.race['ocular_power']) && global.race.species !== 'protoplasm'){
                                            renderSupernatural();
                                        }
                                        break;
                                }
                            }
                            return tab;
                        }
                    },
                    filters: {
                        label(lbl){
                            return tabLabel(lbl);
                        }
                    }
                });

                Object.keys(gridDefs()).forEach(function(gridtype){
                    powerGrid(gridtype);
                });
                setPowerGrid();

                $('#civic').append($('<div id="civics" class="tile is-parent"></div>'));
                defineJobs();
                $('#civics').append($('<div id="r_civics" class="tile is-vertical is-parent civics"></div>'));
                defineGovernment();
                if (global.race.species !== 'protoplasm' && !global.race['start_cataclysm']){
                    defineGarrison();
                    buildGarrison($('#c_garrison'),false);
                    if (!global.race['warlord']){
                        buildFortress($('#fortress'),false);
                    }
                    foreignGov();
                    drawMechLab();
                    if (global.race['truepath']){
                        drawShipYard();
                    }
                    if (global.race['psychic'] && global.tech['psychic']){
                        renderPsychicPowers();
                    }
                    if ((global.race['wish'] && global.tech['wish']) || global.race['ocular_power']){
                        renderSupernatural();
                    }
                }
                if (global.race['shapeshifter']){
                    shapeShift(false,true);
                }
                defineIndustry();
            }
            break;
        case 3:
        case 'mTabResearch':
            {
                if (!global.settings.tabLoad){
                    tagEvent('page_view',{ page_title: `Evolve - Research` });
                }
                $(`#mTabResearch`).append(`<div id="resQueue" class="resQueue" v-show="rq.display"></div>
                <b-tabs class="resTabs" v-model="s.resTabs" :animated="s.animated">
                    <b-tab-item id="tech">
                        <template slot="header">
                            <h2 class="is-sr-only">{{ 'new_sr' | label }}</h2>
                            <span aria-hidden="true">{{ 'new' | label }}</span>
                        </template>
                    </b-tab-item>
                    <b-tab-item id="oldTech">
                        <template slot="header">
                            <h2 class="is-sr-only">{{ 'old_sr' | label }}</h2>
                            <span aria-hidden="true">{{ 'old' | label }}</span>
                        </template>
                    </b-tab-item>
                </b-tabs>`);
                vBind({
                    el: `#mTabResearch`,
                    data: {
                        s: global.settings,
                        rq: global.r_queue
                    },
                    filters: {
                        label(lbl){
                            return tabLabel(lbl);
                        }
                    }
                });
                resQueue();
                if (global.race.species !== 'protoplasm'){
                    drawTech();
                }
            }
            break;
        case 4:
        case 'mTabResource':
            {
                if (!global.settings.tabLoad){
                    tagEvent('page_view',{ page_title: `Evolve - Resources` });
                }
                $(`#mTabResource`).append(`<b-tabs class="resTabs" v-model="s.marketTabs" :animated="s.animated" @input="swapTab">
                    <b-tab-item id="market" :visible="s.showMarket">
                        <template slot="header">
                            {{ 'tab_market' | label }}
                        </template>
                    </b-tab-item>
                    <b-tab-item id="resStorage" :visible="s.showStorage">
                        <template slot="header">
                            {{ 'tab_storage' | label }}
                        </template>
                    </b-tab-item>
                    <b-tab-item id="resEjector" :visible="s.showEjector">
                        <template slot="header">
                            {{ 'tab_ejector' | label }}
                        </template>
                    </b-tab-item>
                    <b-tab-item id="resCargo" :visible="s.showCargo">
                        <template slot="header">
                            {{ 'tab_cargo' | label }}
                        </template>
                    </b-tab-item>
                    <b-tab-item id="resAlchemy" :visible="s.showAlchemy">
                        <template slot="header">
                            {{ 'tab_alchemy' | label }}
                        </template>
                    </b-tab-item>
                </b-tabs>`);
                vBind({
                    el: `#mTabResource`,
                    data: {
                        s: global.settings
                    },
                    methods: {
                        swapTab(tab){
                            if (!global.settings.tabLoad){
                                clearElement($(`#market`));
                                clearElement($(`#resStorage`));
                                clearElement($(`#resEjector`));
                                clearElement($(`#resCargo`));
                                clearElement($(`#resAlchemy`));
                                switch (tab){
                                    case 0:
                                        {
                                            drawResourceTab('market');
                                        }
                                        break;
                                    case 1:
                                        {
                                            drawResourceTab('storage');
                                        }
                                        break;
                                    case 2:
                                        {
                                            drawResourceTab('ejector');
                                        }
                                        break;
                                    case 3:
                                        {
                                            drawResourceTab('supply');
                                        }
                                        break;
                                    case 4:
                                        {
                                            drawResourceTab('alchemy');
                                        }
                                        break;
                                }
                            }
                            return tab;
                        }
                    },
                    filters: {
                        label(lbl){
                            return tabLabel(lbl);
                        }
                    }
                });

                initResourceTabs();
                if (tmp_vars.hasOwnProperty('resource')){
                    Object.keys(tmp_vars.resource).forEach(function(name){
                        let color = tmp_vars.resource[name].color;
                        let tradable = tmp_vars.resource[name].tradable;
                        let stackable = tmp_vars.resource[name].stackable;

                        if (stackable){
                            var market_item = $(`<div id="stack-${name}" class="market-item" v-show="display"></div>`);
                            $('#resStorage').append(market_item);
                            containerItem(`#stack-${name}`,market_item,name,color,true);
                        }

                        if (tradable){
                            var market_item = $(`<div id="market-${name}" class="market-item" v-show="r.display"></div>`);
                            $('#market').append(market_item);
                            marketItem(`#market-${name}`,market_item,name,color,true);
                        }
                    
                        if (atomic_mass[name]){
                            loadEjector(name,color);
                        }
                    
                        if (supplyValue[name]){
                            loadSupply(name,color);
                        }
                    
                        if (tradeRatio[name] && global.race.universe === 'magic'){
                            global['resource'][name]['basic'] = tradable;
                            loadAlchemy(name,color,tradable);
                        }
                    });
                }
                tradeSummery();
            }
            break;
        case 5:
        case 'mTabArpa':
            {
                if (!global.settings.tabLoad){
                    tagEvent('page_view',{ page_title: `Evolve - Arpa` });
                }
                $(`#mTabArpa`).append(`<div id="apra" class="arpa">
                    <b-tabs class="resTabs" v-model="s.arpa.arpaTabs" :animated="s.animated">
                        <b-tab-item id="arpaPhysics" :visible="s.arpa.physics" label="${loc('tab_arpa_projects')}"></b-tab-item>
                        <b-tab-item id="arpaGenetics" :visible="s.arpa.genetics" label="${loc(global.race['artifical'] ? 'tab_arpa_machine' : 'tab_arpa_genetics')}"></b-tab-item>
                        <b-tab-item id="arpaCrispr" :visible="s.arpa.crispr" label="${loc('tab_arpa_crispr')}"></b-tab-item>
                        <b-tab-item id="arpaBlood" :visible="s.arpa.blood" label="${loc('tab_arpa_blood')}"></b-tab-item>
                    </b-tabs>
                </div>`);
                vBind({
                    el: `#mTabArpa`,
                    data: {
                        s: global.settings
                    },
                    filters: {
                        label(lbl){
                            return tabLabel(lbl);
                        }
                    }
                });
                arpa('Physics');
                arpa('Genetics');
                arpa('Crispr');
                arpa('Blood');
            }
            break;
        case 6:
        case 'mTabStats':
            {
                if (!global.settings.tabLoad){
                    tagEvent('page_view',{ page_title: `Evolve - Stats` });
                }
                $(`#mTabStats`).append(`<b-tabs class="resTabs" v-model="s.statsTabs" :animated="s.animated">
                    <b-tab-item id="stats">
                        <template slot="header">
                            {{ 'tab_stats' | label }}
                        </template>
                    </b-tab-item>
                    <b-tab-item id="achieve">
                        <template slot="header">
                            {{ 'tab_achieve' | label }}
                        </template>
                    </b-tab-item>
                    <b-tab-item id="perks">
                        <template slot="header">
                            {{ 'tab_perks' | label }}
                        </template>
                    </b-tab-item>
                </b-tabs>`);
                vBind({
                    el: `#mTabStats`,
                    data: {
                        s: global.settings
                    },
                    filters: {
                        label(lbl){
                            return tabLabel(lbl);
                        }
                    }
                });
                setupStats();
            }
            break;
        case 7:
            if (!global.settings.tabLoad){
                tagEvent('page_view',{ page_title: `Evolve - Settings` });
            }
            break;
        case 'mTabObserve':
        default:
            if (!global.settings.tabLoad){
                tagEvent('page_view',{ page_title: `Evolve - Hell Observation` });
            }
            if (global.portal.observe){
                drawHellObservations(true);
            }
            break;
    }
    if ($(`#popper`).length > 0 && $(`#${$(`#popper`).data('id')}`).length === 0){
        clearPopper();
    }
}

export function index(){
    // Most UI is now rendered by React.
    // This function handles remaining legacy init.

    clearElement($('#buildQueue'));

    // Remove the loading spinner if present
    $('.loading').remove();

    $('html').addClass(global.settings.font);

    // Build queue — just needs v-show attribute
    $('#buildQueue').attr('v-show', 'display');
}
