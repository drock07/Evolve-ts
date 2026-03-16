/**
 * Temporary bridge hook for SettingsPanel data.
 * Reads from legacy global state and produces SettingsPanelData props.
 */

import { useGameTick } from './useGameState';
import { global, save, webWorker, sizeApproximation } from '../vars';
import { loc, locales } from '../locale';
import { legacy } from './legacyBridge';
import { SettingsPanelData, SettingsPanelCallbacks, SettingsDropdowns } from '../components/SettingsPanel';
import { DropdownOption } from '../components/SettingsDropdown';

const THEMES: DropdownOption[] = [
    { value: 'dark', label: loc('theme_dark') },
    { value: 'light', label: loc('theme_light') },
    { value: 'night', label: loc('theme_night') },
    { value: 'darkNight', label: loc('theme_darkNight') },
    { value: 'redgreen', label: loc('theme_redgreen') },
    { value: 'gruvboxLight', label: loc('theme_gruvboxLight') },
    { value: 'gruvboxDark', label: loc('theme_gruvboxDark') },
    { value: 'gruvboxDarkRG', label: loc('theme_gruvboxDarkRG') },
    { value: 'orangeSoda', label: loc('theme_orangeSoda') },
    { value: 'dracula', label: loc('theme_dracula') },
];

const NOTATIONS: DropdownOption[] = [
    { value: 'si', label: loc('metric') },
    { value: 'sci', label: loc('scientific') },
    { value: 'eng', label: loc('engineering') },
    { value: 'sln', label: loc('sln') },
];

const FONTS: DropdownOption[] = [
    { value: 'standard', label: loc('standard') },
    { value: 'large_log', label: loc('large_log') },
    { value: 'large_all', label: loc('large_all') },
];

const QUEUE_STYLES: DropdownOption[] = [
    { value: 'standardqueuestyle', label: loc('standardqueuestyle') },
    { value: 'listqueuestyle', label: loc('listqueuestyle') },
    { value: 'bulletlistqueuestyle', label: loc('bulletlistqueuestyle') },
    { value: 'numberedlistqueuestyle', label: loc('numberedlistqueuestyle') },
];

const QUEUE_MERGE: DropdownOption[] = [
    { value: 'merge_never', label: loc('merge_never') },
    { value: 'merge_nearby', label: loc('merge_nearby') },
    { value: 'merge_all', label: loc('merge_all') },
];

const QUEUE_RESIZE: DropdownOption[] = [
    { value: 'auto', label: loc('q_resize_auto') },
    { value: 'grow', label: loc('q_resize_grow') },
    { value: 'shrink', label: loc('q_resize_shrink') },
    { value: 'manual', label: loc('q_resize_manual') },
];

function getLocaleOptions(): DropdownOption[] {
    return Object.keys(locales).map(k => ({ value: k, label: locales[k] }));
}

function getIconOptions(): DropdownOption[] {
    const opts: DropdownOption[] = [{ value: 'star', label: loc('star') }];
    const icons = [
        { i: 'nuclear', f: 'steelem', r: 2 },
        { i: 'zombie', f: 'the_misery', r: 2 },
        { i: 'fire', f: 'ill_advised', r: 2 },
        { i: 'mask', f: 'friday', r: 1 },
        { i: 'skull', f: 'demon_slayer', r: 2 },
        { i: 'taijitu', f: 'equilibrium', r: 2 },
        { i: 'martini', f: 'utopia', r: 2 },
        { i: 'lightbulb', f: 'energetic', r: 2 },
        { i: 'trash', f: 'garbage_pie', r: 2 },
        { i: 'banana', f: 'banana', r: 2 },
        { i: 'turtle', f: 'finish_line', r: 2 },
        { i: 'floppy', f: 'digital_ascension', r: 2 },
        { i: 'slime', f: 'slime_lord', r: 2 },
        { i: 'sludge', f: 'grand_death_tour', r: 2 },
        { i: 'lightning', f: 'annihilation', r: 2 },
        { i: 'trophy', f: 'wish', r: 2 },
        { i: 'robot', f: 'planned_obsolescence', r: 2 },
        { i: 'heart', f: 'valentine', r: 1 },
        { i: 'clover', f: 'leprechaun', r: 1 },
        { i: 'bunny', f: 'easter', r: 1 },
        { i: 'egg', f: 'egghunt', r: 1 },
        { i: 'rocket', f: 'launch_day', r: 1 },
        { i: 'sun', f: 'solstice', r: 1 },
        { i: 'firework', f: 'firework', r: 1 },
        { i: 'ghost', f: 'halloween', r: 1 },
        { i: 'candy', f: 'trickortreat', r: 1 },
        { i: 'turkey', f: 'thanksgiving', r: 1 },
        { i: 'meat', f: 'immortal', r: 1 },
        { i: 'present', f: 'xmas', r: 1 },
    ];
    let currentIconValid = global.settings.icon === 'star';
    for (const icon of icons) {
        if (global.stats.feat[icon.f] && global.stats.feat[icon.f] >= icon.r) {
            opts.push({ value: icon.i, label: loc(icon.i) });
            if (global.settings.icon === icon.i) {
                currentIconValid = true;
            }
        }
    }
    // Fallback to star if the selected icon isn't unlocked
    if (!currentIconValid) {
        global.settings.icon = 'star';
    }
    return opts;
}

function reloadPage() {
    save.setItem('evolved', LZString.compressToUTF16(JSON.stringify(global)));
    if (webWorker.w) {
        webWorker.w.terminate();
    }
    window.location.reload();
}

export function useSettingsData(): { data: SettingsPanelData; callbacks: SettingsPanelCallbacks } {
    useGameTick();

    const s = global.settings;

    const dropdowns: SettingsDropdowns = {
        theme: { value: s.theme, options: THEMES },
        notation: { value: s.affix, options: NOTATIONS },
        icon: { value: s.icon, options: getIconOptions() },
        locale: { value: s.locale, options: getLocaleOptions() },
        font: { value: s.font, options: FONTS },
        queueStyle: { value: s.queuestyle, options: QUEUE_STYLES },
        queueMerge: { value: s.q_merge, options: QUEUE_MERGE },
        queueResize: { value: s.q_resize, options: QUEUE_RESIZE },
    };

    const data: SettingsPanelData = {
        dropdowns,
        toggles: {
            pause: !!s.pause,
            mKeys: !!s.mKeys,
            cLabels: !!s.cLabels,
            alwaysPower: !!s.alwaysPower,
            qKey: !!s.qKey,
            qAny: !!s.qAny,
            qAny_res: !!s.qAny_res,
            sPackOn: !!s.sPackOn,
            expose: !!s.expose,
            tabLoad: !!s.tabLoad,
            boring: !!s.boring,
            touch: !!s.touch,
        },
        keyMap: {
            x10: s.keyMap.x10,
            x25: s.keyMap.x25,
            x100: s.keyMap.x100,
            q: s.keyMap.q,
            showCiv: s.keyMap.showCiv,
            showCivic: s.keyMap.showCivic,
            showResearch: s.keyMap.showResearch,
            showResources: s.keyMap.showResources,
            showGenetics: s.keyMap.showGenetics,
            showAchieve: s.keyMap.showAchieve,
            settings: s.keyMap.settings,
        },
        labels: {
            theme: loc('theme'),
            units: loc('units'),
            icons: loc('icons'),
            locale: loc('locale'),
            font: loc('font'),
            queuestyle: loc('queuestyle'),
            q_merge: loc('q_merge'),
            q_resize: loc('q_resize'),
            pause: loc('pause'),
            m_keys: loc('m_keys'),
            c_cat: loc('c_cat'),
            always_power: loc('always_power'),
            q_key: loc('q_key'),
            q_any: loc('q_any'),
            q_any_res: loc('q_any_res'),
            s_pack_on: loc('s_pack_on'),
            expose: loc('expose'),
            tabLoad: loc('tabLoad'),
            boring: loc('boring'),
            touch: loc('touch'),
            key_mappings: loc('key_mappings'),
            tab_mappings: loc('tab_mappings'),
            multiplier10: loc('multiplier', [10]),
            multiplier25: loc('multiplier', [25]),
            multiplier100: loc('multiplier', [100]),
            import_export: loc('import_export'),
            import: loc('import'),
            export: loc('export'),
            export_file: loc('export_file'),
            restore: loc('restore'),
            enable_reset: loc('enable_reset'),
            reset_warn: loc('reset_warn'),
            reset_soft: loc('reset_soft'),
            reset_hard: loc('reset_hard'),
            load_string_pack: loc('load_string_pack'),
            clear_string_pack: loc('clear_string_pack'),
            sPackMsg: s.sPackMsg || '',
            tab_civil: loc('tab_civil'),
            tab_civics: loc('tab_civics'),
            tab_research: loc('tab_research'),
            tab_resources: loc('tab_resources'),
            tech_arpa: loc('tech_arpa'),
            tab_stats: loc('tab_stats'),
            tab_settings: loc('tab_settings'),
        },
        disableReset: !!s.disableReset,
    };

    const callbacks: SettingsPanelCallbacks = {
        onDropdownChange: (id, value) => {
            switch (id) {
                case 'theme':
                    s.theme = value;
                    $('html').removeClass().addClass(value).addClass(s.font);
                    break;
                case 'notation':
                    s.affix = value;
                    break;
                case 'icon':
                    s.icon = value;
                    reloadPage();
                    break;
                case 'locale':
                    s.locale = value;
                    global.queue.rename = true;
                    reloadPage();
                    break;
                case 'font':
                    s.font = value;
                    $('html').removeClass('standard').removeClass('large_log').removeClass('large_all').addClass(value);
                    break;
                case 'queueStyle':
                    s.queuestyle = value;
                    break;
                case 'queueMerge':
                    s.q_merge = value;
                    break;
                case 'queueResize':
                    s.q_resize = value;
                    break;
            }
        },
        onToggleChange: (id, value) => {
            (s as any)[id] = value;
            if (id === 'pause') {
                if (!value && !webWorker.s && legacy.gameLoop) {
                    legacy.gameLoop('start');
                }
            }
            if (id === 'sPackOn') {
                if (save.getItem('string_pack')) {
                    reloadPage();
                }
            }
            if (id === 'tabLoad') {
                // Trigger tab reload
            }
        },
        onKeyMapChange: (id, value) => {
            (s.keyMap as any)[id] = value;
        },
        onImport: (data) => {
            if (data.length > 0) {
                (window as any).importGame(data);
            }
        },
        onExport: () => {
            return (window as any).exportGame();
        },
        onExportFile: () => {
            const date = new Date();
            const y = date.getFullYear();
            const m = (date.getMonth() + 1).toString().padStart(2, '0');
            const d = date.getDate().toString().padStart(2, '0');
            const h = date.getHours().toString().padStart(2, '0');
            const min = date.getMinutes().toString().padStart(2, '0');
            const content = (window as any).exportGame();
            const a = document.createElement('a');
            const file = new Blob([content], { type: 'text/plain' });
            a.href = URL.createObjectURL(file);
            a.download = `evolve-${y}-${m}-${d}-${h}-${min}.txt`;
            a.click();
            URL.revokeObjectURL(a.href);
        },
        onRestore: () => {
            const restoreData = save.getItem('evolveBak') || false;
            if (restoreData && confirm(loc('restore_warning'))) {
                (window as any).importGame(restoreData, true);
            }
        },
        onSoftReset: () => {
            (window as any).soft_reset();
        },
        onHardReset: () => {
            (window as any).reset();
        },
        onImportStringFile: (file) => {
            const reader = new FileReader();
            reader.readAsText(file, 'UTF-8');
            reader.onload = (evt) => {
                try {
                    JSON.parse(evt.target!.result as string);
                } catch {
                    s.sPackMsg = loc('string_pack_error', [file.name]);
                    return;
                }
                s.sPackMsg = loc('string_pack_using', [file.name]);
                save.setItem('string_pack_name', file.name);
                save.setItem('string_pack', LZString.compressToUTF16(evt.target!.result as string));
                if (s.sPackOn) {
                    global.queue.rename = true;
                    reloadPage();
                }
            };
        },
        onClearStringFile: () => {
            if (save.getItem('string_pack')) {
                s.sPackMsg = loc('string_pack_none');
                save.removeItem('string_pack_name');
                save.removeItem('string_pack');
                if (s.sPackOn) {
                    global.queue.rename = true;
                    reloadPage();
                }
            }
        },
        onDisableResetToggle: (value) => {
            s.disableReset = value;
        },
    };

    return { data, callbacks };
}
