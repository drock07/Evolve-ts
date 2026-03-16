/**
 * Temporary bridge hook for MessageQueue data.
 * Reads from legacy global state and produces MessageQueueData props.
 */

import { useGameTick } from './useGameState';
import { global, message_logs, message_filters } from '../vars';
import { loc } from '../locale';
import { legacy } from './legacyBridge';
import { MessageQueueData, MessageQueueCallbacks, Message, MessageFilter } from '../components/MessageQueue';

export function useMessageQueueData(): { data: MessageQueueData; callbacks: MessageQueueCallbacks } {
    useGameTick();

    const activeFilter = message_logs.view || 'all';

    // Build current messages from the active filter's log
    const messages: Message[] = (message_logs[activeFilter] || []).map((msg: any) => ({
        msg: msg.msg,
        color: msg.color,
    }));

    // Build filter definitions
    const filters: MessageFilter[] = message_filters.map((key: string) => ({
        key,
        label: loc('message_log_' + key),
        visible: !!global.settings.msgFilters[key]?.vis,
        unlocked: !!global.settings.msgFilters[key]?.unlocked,
        max: global.settings.msgFilters[key]?.max ?? 30,
        save: global.settings.msgFilters[key]?.save ?? 0,
    }));

    const data: MessageQueueData = {
        messages,
        filters,
        activeFilter,
        labels: {
            title: loc('message_log'),
            clear: loc('message_log_clear'),
            clearAll: loc('message_log_clear_all'),
            settingsVisible: loc('message_log_settings_visible'),
            settingsLength: loc('message_log_settings_length'),
            settingsSave: loc('message_log_settings_save'),
            apply: loc('message_log_settings_apply'),
        },
    };

    const callbacks: MessageQueueCallbacks = {
        onFilterChange: (filter: string) => {
            message_logs.view = filter;
        },
        onClear: (filter?: string) => {
            if (legacy.initMessageQueue) {
                legacy.initMessageQueue(filter ? [filter] : filter);
            }
            if (filter) {
                global.lastMsg[filter] = [];
            } else {
                Object.keys(global.lastMsg).forEach(tag => {
                    global.lastMsg[tag] = [];
                });
            }
        },
        onFilterVisibilityChange: (filter: string, visible: boolean) => {
            global.settings.msgFilters[filter].vis = visible;
            // If hiding the active filter, switch to first visible one
            if (!visible && message_logs.view === filter) {
                for (const f of message_filters) {
                    if (global.settings.msgFilters[f].vis) {
                        message_logs.view = f;
                        break;
                    }
                }
            }
        },
        onMaxChange: (filter: string, max: number) => {
            global.settings.msgFilters[filter].max = Math.max(1, max);
        },
        onSaveChange: (filter: string, save: number) => {
            global.settings.msgFilters[filter].save = Math.max(0, Math.min(save, global.settings.msgFilters[filter].max));
        },
        onApplyMax: (values: Record<string, number>) => {
            message_filters.forEach((filter: string) => {
                const max = Math.max(1, values[filter] ?? global.settings.msgFilters[filter].max);
                global.settings.msgFilters[filter].max = max;
                if (max < global.settings.msgFilters[filter].save) {
                    global.settings.msgFilters[filter].save = max;
                    global.lastMsg[filter].splice(max);
                }
                message_logs[filter].splice(max);
            });
        },
        onApplySave: (values: Record<string, number>) => {
            message_filters.forEach((filter: string) => {
                const save = Math.max(0, Math.min(values[filter] ?? 0, global.settings.msgFilters[filter].max));
                global.settings.msgFilters[filter].save = save;
                global.lastMsg[filter].splice(save);
            });
        },
    };

    return { data, callbacks };
}
