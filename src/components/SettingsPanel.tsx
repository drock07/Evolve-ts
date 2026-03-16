/**
 * SettingsPanel — pure presentational component.
 *
 * Renders game settings: dropdowns, toggles, key mappings,
 * import/export, and reset. No game engine knowledge.
 */

import { useState } from 'react';
import { Field, Label, Switch } from '@headlessui/react';
import { SettingsDropdown, DropdownOption } from './SettingsDropdown';

// ── Types ──

export interface SettingsDropdowns {
    theme: { value: string; options: DropdownOption[] };
    notation: { value: string; options: DropdownOption[] };
    icon: { value: string; options: DropdownOption[] };
    locale: { value: string; options: DropdownOption[] };
    font: { value: string; options: DropdownOption[] };
    queueStyle: { value: string; options: DropdownOption[] };
    queueMerge: { value: string; options: DropdownOption[] };
    queueResize: { value: string; options: DropdownOption[] };
}

export interface SettingsToggles {
    pause: boolean;
    mKeys: boolean;
    cLabels: boolean;
    alwaysPower: boolean;
    qKey: boolean;
    qAny: boolean;
    qAny_res: boolean;
    sPackOn: boolean;
    expose: boolean;
    tabLoad: boolean;
    boring: boolean;
    touch: boolean;
}

export interface SettingsKeyMap {
    x10: string;
    x25: string;
    x100: string;
    q: string;
    showCiv: string;
    showCivic: string;
    showResearch: string;
    showResources: string;
    showGenetics: string;
    showAchieve: string;
    settings: string;
}

export interface SettingsLabels {
    theme: string;
    units: string;
    icons: string;
    locale: string;
    font: string;
    queuestyle: string;
    q_merge: string;
    q_resize: string;
    pause: string;
    m_keys: string;
    c_cat: string;
    always_power: string;
    q_key: string;
    q_any: string;
    q_any_res: string;
    s_pack_on: string;
    expose: string;
    tabLoad: string;
    boring: string;
    touch: string;
    key_mappings: string;
    tab_mappings: string;
    multiplier10: string;
    multiplier25: string;
    multiplier100: string;
    import_export: string;
    import: string;
    export: string;
    export_file: string;
    restore: string;
    enable_reset: string;
    reset_warn: string;
    reset_soft: string;
    reset_hard: string;
    load_string_pack: string;
    clear_string_pack: string;
    sPackMsg: string;
    tab_civil: string;
    tab_civics: string;
    tab_research: string;
    tab_resources: string;
    tech_arpa: string;
    tab_stats: string;
    tab_settings: string;
}

export interface SettingsPanelData {
    dropdowns: SettingsDropdowns;
    toggles: SettingsToggles;
    keyMap: SettingsKeyMap;
    labels: SettingsLabels;
    disableReset: boolean;
}

export interface SettingsPanelCallbacks {
    onDropdownChange: (id: keyof SettingsDropdowns, value: string) => void;
    onToggleChange: (id: keyof SettingsToggles, value: boolean) => void;
    onKeyMapChange: (id: keyof SettingsKeyMap, value: string) => void;
    onImport: (data: string) => void;
    onExport: () => string;
    onExportFile: () => void;
    onRestore: () => void;
    onSoftReset: () => void;
    onHardReset: () => void;
    onImportStringFile: (file: File) => void;
    onClearStringFile: () => void;
    onDisableResetToggle: (value: boolean) => void;
}

// ── Components ──

function SettingsToggle({ label, checked, onChange }: {
    label: string;
    checked: boolean;
    onChange: (val: boolean) => void;
}) {
    return (
        <Field as="div" className="switch setting">
            <Switch
                checked={checked}
                onChange={onChange}
                className="check"
            />
            <Label className="control-label">{label}</Label>
        </Field>
    );
}

export function SettingsPanel({ data, callbacks }: { data: SettingsPanelData; callbacks: SettingsPanelCallbacks }) {
    const [importText, setImportText] = useState('');
    const [resetEnabled, setResetEnabled] = useState(data.disableReset);
    const l = data.labels;

    return (
        <div>
            {/* Theme, Notation, Icons */}
            <div className="theme">
                <SettingsDropdown
                    label={l.theme}
                    value={data.dropdowns.theme.value}
                    options={data.dropdowns.theme.options}
                    onChange={v => callbacks.onDropdownChange('theme', v)}
                />
                <SettingsDropdown
                    label={l.units}
                    value={data.dropdowns.notation.value}
                    options={data.dropdowns.notation.options}
                    onChange={v => callbacks.onDropdownChange('notation', v)}
                />
                <SettingsDropdown
                    label={l.icons}
                    value={data.dropdowns.icon.value}
                    options={data.dropdowns.icon.options}
                    onChange={v => callbacks.onDropdownChange('icon', v)}
                />
            </div>

            {/* Locale, Font */}
            <div className="localization">
                <SettingsDropdown
                    label={l.locale}
                    value={data.dropdowns.locale.value}
                    options={data.dropdowns.locale.options}
                    onChange={v => callbacks.onDropdownChange('locale', v)}
                />
                <SettingsDropdown
                    label={l.font}
                    value={data.dropdowns.font.value}
                    options={data.dropdowns.font.options}
                    onChange={v => callbacks.onDropdownChange('font', v)}
                />
            </div>

            {/* Queue settings */}
            <div className="queue">
                <SettingsDropdown
                    label={l.queuestyle}
                    value={data.dropdowns.queueStyle.value}
                    options={data.dropdowns.queueStyle.options}
                    onChange={v => callbacks.onDropdownChange('queueStyle', v)}
                />
                <SettingsDropdown
                    label={l.q_merge}
                    value={data.dropdowns.queueMerge.value}
                    options={data.dropdowns.queueMerge.options}
                    onChange={v => callbacks.onDropdownChange('queueMerge', v)}
                />
                <SettingsDropdown
                    label={l.q_resize}
                    value={data.dropdowns.queueResize.value}
                    options={data.dropdowns.queueResize.options}
                    onChange={v => callbacks.onDropdownChange('queueResize', v)}
                />
            </div>

            {/* Toggles */}
            <SettingsToggle label={l.pause} checked={data.toggles.pause} onChange={v => callbacks.onToggleChange('pause', v)} />
            <SettingsToggle label={l.m_keys} checked={data.toggles.mKeys} onChange={v => callbacks.onToggleChange('mKeys', v)} />
            <SettingsToggle label={l.c_cat} checked={data.toggles.cLabels} onChange={v => callbacks.onToggleChange('cLabels', v)} />
            <SettingsToggle label={l.always_power} checked={data.toggles.alwaysPower} onChange={v => callbacks.onToggleChange('alwaysPower', v)} />
            <SettingsToggle label={l.q_key} checked={data.toggles.qKey} onChange={v => callbacks.onToggleChange('qKey', v)} />
            <SettingsToggle label={l.q_any} checked={data.toggles.qAny} onChange={v => callbacks.onToggleChange('qAny', v)} />
            <SettingsToggle label={l.q_any_res} checked={data.toggles.qAny_res} onChange={v => callbacks.onToggleChange('qAny_res', v)} />
            <SettingsToggle label={l.s_pack_on} checked={data.toggles.sPackOn} onChange={v => callbacks.onToggleChange('sPackOn', v)} />
            <SettingsToggle label={l.expose} checked={data.toggles.expose} onChange={v => callbacks.onToggleChange('expose', v)} />
            <SettingsToggle label={l.tabLoad} checked={data.toggles.tabLoad} onChange={v => callbacks.onToggleChange('tabLoad', v)} />
            <SettingsToggle label={l.boring} checked={data.toggles.boring} onChange={v => callbacks.onToggleChange('boring', v)} />
            <SettingsToggle label={l.touch} checked={data.toggles.touch} onChange={v => callbacks.onToggleChange('touch', v)} />

            {/* Key Mappings */}
            <div>
                <div>{l.key_mappings}</div>
                <div className="keyMap"><span>{l.multiplier10}</span> <input value={data.keyMap.x10} onChange={e => callbacks.onKeyMapChange('x10', e.target.value)} /></div>
                <div className="keyMap"><span>{l.multiplier25}</span> <input value={data.keyMap.x25} onChange={e => callbacks.onKeyMapChange('x25', e.target.value)} /></div>
                <div className="keyMap"><span>{l.multiplier100}</span> <input value={data.keyMap.x100} onChange={e => callbacks.onKeyMapChange('x100', e.target.value)} /></div>
                <div className="keyMap"><span>{l.q_key}</span> <input value={data.keyMap.q} onChange={e => callbacks.onKeyMapChange('q', e.target.value)} /></div>
            </div>

            {/* Tab Mappings */}
            <div className="importExport">
                <div>{l.tab_mappings}</div>
                <div className="keyMap"><span>{l.tab_civil}</span> <input value={data.keyMap.showCiv} onChange={e => callbacks.onKeyMapChange('showCiv', e.target.value)} /></div>
                <div className="keyMap"><span>{l.tab_civics}</span> <input value={data.keyMap.showCivic} onChange={e => callbacks.onKeyMapChange('showCivic', e.target.value)} /></div>
                <div className="keyMap"><span>{l.tab_research}</span> <input value={data.keyMap.showResearch} onChange={e => callbacks.onKeyMapChange('showResearch', e.target.value)} /></div>
                <div className="keyMap"><span>{l.tab_resources}</span> <input value={data.keyMap.showResources} onChange={e => callbacks.onKeyMapChange('showResources', e.target.value)} /></div>
                <div className="keyMap"><span>{l.tech_arpa}</span> <input value={data.keyMap.showGenetics} onChange={e => callbacks.onKeyMapChange('showGenetics', e.target.value)} /></div>
                <div className="keyMap"><span>{l.tab_stats}</span> <input value={data.keyMap.showAchieve} onChange={e => callbacks.onKeyMapChange('showAchieve', e.target.value)} /></div>
                <div className="keyMap"><span>{l.tab_settings}</span> <input value={data.keyMap.settings} onChange={e => callbacks.onKeyMapChange('settings', e.target.value)} /></div>
            </div>

            {/* String Pack */}
            <div className="stringPack setting">
                <button className="button" onClick={() => {
                    const input = document.getElementById('stringPackFile') as HTMLInputElement;
                    const file = input?.files?.[0];
                    if (file) callbacks.onImportStringFile(file);
                }}>{l.load_string_pack}</button>
                <input type="file" className="fileImport" id="stringPackFile" accept="text/plain, application/json" />
                <button className="button right" onClick={callbacks.onClearStringFile}>{l.clear_string_pack}</button>
            </div>
            <div className="stringPack setting">
                <span>{l.sPackMsg}</span>
            </div>

            {/* Import/Export */}
            <div className="importExport">
                <div>{l.import_export}</div>
                <textarea id="importExport" value={importText} onChange={e => setImportText(e.target.value)} />
                <button className="button" onClick={() => callbacks.onImport(importText)}>{l.import}</button>
                <button className="button" onClick={() => setImportText(callbacks.onExport())}>{l.export}</button>
                <button className="button" onClick={callbacks.onExportFile}>{l.export_file}</button>
                <button className="button right" onClick={callbacks.onRestore}>{l.restore}</button>
            </div>

            {/* Reset */}
            <div className="reset">
                <Field as="div" className="switch">
                    <Switch
                        checked={resetEnabled}
                        onChange={(val: boolean) => {
                            setResetEnabled(val);
                            callbacks.onDisableResetToggle(val);
                        }}
                        className="check"
                    />
                    <Label className="control-label">{l.enable_reset}</Label>
                </Field>
                {resetEnabled && (
                    <div className="notification">
                        <div className="content">
                            <h4 className="has-text-danger">{l.reset_warn}</h4>
                            <p>
                                <button className="button" disabled={!resetEnabled} onClick={callbacks.onSoftReset}>{l.reset_soft}</button>
                                <button className="button right" disabled={!resetEnabled} onClick={callbacks.onHardReset}>{l.reset_hard}</button>
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
