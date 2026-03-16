/**
 * MessageQueue — pure presentational component.
 *
 * Displays the message log with filter tabs, clear buttons,
 * and a settings modal for visibility/length/save configuration.
 */

import { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, DialogBackdrop } from '@headlessui/react';

// ── Types ──

export interface Message {
    msg: string;
    color: string;
}

export interface MessageFilter {
    key: string;
    label: string;
    visible: boolean;
    unlocked: boolean;
    max: number;
    save: number;
}

export interface MessageQueueData {
    messages: Message[];
    filters: MessageFilter[];
    activeFilter: string;
    labels: {
        title: string;
        clear: string;
        clearAll: string;
        settingsVisible: string;
        settingsLength: string;
        settingsSave: string;
        apply: string;
    };
}

export interface MessageQueueCallbacks {
    onFilterChange: (filter: string) => void;
    onClear: (filter?: string) => void;
    onFilterVisibilityChange: (filter: string, visible: boolean) => void;
    onMaxChange: (filter: string, max: number) => void;
    onSaveChange: (filter: string, save: number) => void;
    onApplyMax: (values: Record<string, number>) => void;
    onApplySave: (values: Record<string, number>) => void;
}

// ── Gear Icon SVG ──

function GearIcon() {
    return (
        <svg version="1.1" x="0px" y="0px" width="12px" height="12px" viewBox="340 140 280 279.416" enableBackground="new 340 140 280 279.416" xmlSpace="preserve">
            <path className="gear" d="M620,305.666v-51.333l-31.5-5.25c-2.333-8.75-5.833-16.917-9.917-23.917L597.25,199.5l-36.167-36.75l-26.25,18.083
            c-7.583-4.083-15.75-7.583-23.916-9.917L505.667,140h-51.334l-5.25,31.5c-8.75,2.333-16.333,5.833-23.916,9.916L399.5,163.333
            L362.75,199.5l18.667,25.666c-4.083,7.584-7.583,15.75-9.917,24.5l-31.5,4.667v51.333l31.5,5.25
            c2.333,8.75,5.833,16.334,9.917,23.917l-18.667,26.25l36.167,36.167l26.25-18.667c7.583,4.083,15.75,7.583,24.5,9.917l5.25,30.916
            h51.333l5.25-31.5c8.167-2.333,16.333-5.833,23.917-9.916l26.25,18.666l36.166-36.166l-18.666-26.25
            c4.083-7.584,7.583-15.167,9.916-23.917L620,305.666z M480,333.666c-29.75,0-53.667-23.916-53.667-53.666s24.5-53.667,53.667-53.667
            S533.667,250.25,533.667,280S509.75,333.666,480,333.666z"/>
        </svg>
    );
}

// ── Settings Modal ──

function MessageSettingsModal({ open, onClose, filters, labels, callbacks }: {
    open: boolean;
    onClose: () => void;
    filters: MessageFilter[];
    labels: MessageQueueData['labels'];
    callbacks: MessageQueueCallbacks;
}) {
    const [maxInputs, setMaxInputs] = useState<Record<string, number>>(() => {
        const m: Record<string, number> = {};
        filters.forEach(f => { m[f.key] = f.max; });
        return m;
    });
    const [saveInputs, setSaveInputs] = useState<Record<string, number>>(() => {
        const s: Record<string, number> = {};
        filters.forEach(f => { s[f.key] = f.save; });
        return s;
    });

    return (
        <Dialog open={open} onClose={onClose} className="modal is-active">
            <DialogBackdrop className="modal-background" />
            <div className="modal-content">
                <DialogPanel className="modalBox" style={{ padding: '1rem', borderRadius: '1rem', textAlign: 'center' }}>
                    <DialogTitle className="has-text-warning modalTitle">{labels.title}</DialogTitle>
                    <div className="modalBody vscroll">
                        {/* Visibility */}
                        <div>
                            <div><span className="has-text-warning">{labels.settingsVisible}</span></div>
                            {filters.filter(f => f.unlocked).map(f => (
                                <div className="msgInput" key={`vis-${f.key}`}>
                                    <span>{f.label}</span>{' '}
                                    <input
                                        type="checkbox"
                                        checked={f.visible}
                                        onChange={e => callbacks.onFilterVisibilityChange(f.key, e.target.checked)}
                                    />
                                </div>
                            ))}
                        </div>

                        <hr />

                        {/* Max length */}
                        <div>
                            <div><span className="has-text-warning">{labels.settingsLength}</span></div>
                            {filters.filter(f => f.unlocked).map(f => (
                                <div className="msgInput" key={`max-${f.key}`}>
                                    <span>{f.label}</span>{' '}
                                    <input
                                        type="number"
                                        min={1}
                                        value={maxInputs[f.key] ?? f.max}
                                        onChange={e => setMaxInputs({ ...maxInputs, [f.key]: Math.max(1, parseInt(e.target.value) || 1) })}
                                    />
                                </div>
                            ))}
                            <div className="msgInputApply">
                                <button className="button" onClick={() => callbacks.onApplyMax(maxInputs)}>{labels.apply}</button>
                            </div>
                        </div>

                        <hr />

                        {/* Save count */}
                        <div>
                            <div><span className="has-text-warning">{labels.settingsSave}</span></div>
                            {filters.filter(f => f.unlocked).map(f => (
                                <div className="msgInput" key={`save-${f.key}`}>
                                    <span>{f.label}</span>{' '}
                                    <input
                                        type="number"
                                        min={0}
                                        max={maxInputs[f.key] ?? f.max}
                                        value={saveInputs[f.key] ?? f.save}
                                        onChange={e => setSaveInputs({ ...saveInputs, [f.key]: Math.max(0, parseInt(e.target.value) || 0) })}
                                    />
                                </div>
                            ))}
                            <div className="msgInputApply">
                                <button className="button" onClick={() => callbacks.onApplySave(saveInputs)}>{labels.apply}</button>
                            </div>
                        </div>
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    );
}

// ── Main Component ──

export function MessageQueue({ data, callbacks }: { data: MessageQueueData; callbacks: MessageQueueCallbacks }) {
    const [modalOpen, setModalOpen] = useState(false);

    return (
        <>
            <div id="msgQueueHeader">
                <h2 className="has-text-success">{data.labels.title}</h2>
                <span className="special" role="button" title="message queue options" onClick={() => setModalOpen(true)}>
                    <GearIcon />
                </span>
                <span role="button" className="zero has-text-advanced" onClick={() => callbacks.onClear(data.activeFilter)}>
                    {data.labels.clear}
                </span>
                <span role="button" className="zero has-text-advanced" onClick={() => callbacks.onClear()}>
                    {data.labels.clearAll}
                </span>
            </div>
            <h2 className="is-sr-only">Message Filters</h2>
            <div id="msgQueueFilters" className="hscroll msgQueueFilters">
                {data.filters.filter(f => f.visible).map(f => (
                    <span
                        key={f.key}
                        id={`msgQueueFilter-${f.key}`}
                        className={data.activeFilter === f.key ? 'is-active' : ''}
                        aria-disabled={data.activeFilter === f.key ? 'true' : 'false'}
                        role="button"
                        onClick={() => callbacks.onFilterChange(f.key)}
                    >
                        {f.label}
                    </span>
                ))}
            </div>
            <h2 className="is-sr-only">Messages</h2>
            <div id="msgQueueLog" aria-live="polite">
                {data.messages.map((msg, i) => (
                    <p key={i} className={`has-text-${msg.color}`}>{msg.msg}</p>
                ))}
            </div>

            <MessageSettingsModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                filters={data.filters}
                labels={data.labels}
                callbacks={callbacks}
            />
        </>
    );
}
