import { clearElement } from './../functions';
import { basicsPage } from './basics';
import { mechanicsPage } from './mechanics';
import { govPage } from './government';
import { governPage } from './governor';
import { combatPage } from './combat';
import { challengesPage } from './challenges';
import { resetsPage } from './resets';
import { planetsPage } from './planets';
import { universePage } from './universes';
import { hellPage } from './hell';

export function gamePlayPage(zone){
    let content = $(`#content`);
    clearElement(content);

    switch (zone){
        case 'basics':
            basicsPage(content);
            break;
        case 'mechanics':
            mechanicsPage(content);
            break;
        case 'government':
            govPage(content);
            break;
        case 'governor':
            governPage(content);
            break;
        case 'combat':
            combatPage(content);
            break;
        case 'challenges':
            challengesPage(content);
            break;
        case 'resets':
            resetsPage(content);
            break;
        case 'planets':
            planetsPage(content);
            break;
        case 'universes':
            universePage(content);
            break;
        case 'hell':
            hellPage(content);
            break;        
    }
}
