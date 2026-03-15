import { clearElement } from './../functions';
import { crisprPage } from './crispr';
import { bloodPage } from './blood';
import { pResPage } from './p_res';
import { resetsPage } from './resets';
import { perksPage } from './perks';

export function prestigePage(zone){
    let content = $(`#content`);
    clearElement(content);

    switch (zone){
        case 'resets':
            resetsPage(content);
            break;
        case 'resources':
            pResPage(content);
            break;
        case 'crispr':
            crisprPage(content);
            break;
        case 'blood':
            bloodPage(content);
            break;
        case 'perks':
            perksPage(content);
            break;
    }
}