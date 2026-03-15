import { clearElement } from './../functions';
import { projectsPage } from './projects';
import { crisprPage } from './crispr';
import { bloodPage } from './blood';

export function arpaPage(zone){
    let content = $(`#content`);
    clearElement(content);

    switch (zone){
        case 'projects':
            projectsPage(content);
            break;
        case 'genetics':
            //geneticsPage(content);
            break;
        case 'crispr':
            crisprPage(content);
            break;
        case 'blood':
            bloodPage(content);
            break;
    }
}
