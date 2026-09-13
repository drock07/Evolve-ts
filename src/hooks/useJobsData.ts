/**
 * Bridges engine state to the job list.
 *
 * The view logic here — the fill-level class, the easter-egg count, the
 * titan-colonist adjustment — is a direct translation of the `level` method
 * and the `d_state` / `event` / `adjust` filters on the old per-job Vue
 * instances.
 */

import { useCallback } from 'react';
import { global, p_on } from '../vars';
import { loc } from '../locale';
import { easterEgg } from '../functions';
import { useGameTick } from './useGameState';
import { legacy } from './legacyBridge';
import { notifyStateChange } from '../state';
import { JobRowData, JobListCallbacks } from '../components/JobList';

/** How full a job is, as a colour class. Mirrors the old `level` method. */
function countClassFor(job: string): string {
    const { workers, max } = global.civic[job];
    if (workers === 0) return 'count has-text-danger';
    if (workers === max) return 'count has-text-success';
    if (max !== undefined) {
        if (workers <= max / 3) return 'count has-text-caution';
        if (workers <= max * 0.66) return 'count has-text-warning';
        if (workers < max) return 'count has-text-info';
    }
    return 'count';
}

/** Titan colonists are supplemented by AI colonists; the old `adjust` filter. */
function adjust(value: number, job: string): number {
    if (job === 'titan_colonist' && p_on['ai_colonist']) {
        return value + legacy.jobScale?.(p_on['ai_colonist']);
    }
    return value;
}

/**
 * The old `event` filter: an easter egg stands in for a zero count on whichever
 * of unemployed/hunter the species actually uses.
 */
function settableCount(job: string): { count: string; countIsMarkup: boolean } {
    const workers = global.civic[job].workers;
    const relevant = (job === 'unemployed' && global.civic.unemployed.display)
        || (job === 'hunter' && !global.civic.unemployed.display);
    if (relevant && workers === 0) {
        const egg = easterEgg(3, 14);
        if (egg.length > 0) return { count: egg, countIsMarkup: true };
    }
    return { count: String(workers), countIsMarkup: false };
}

export function useJobsData(): { rows: JobRowData[]; callbacks: JobListCallbacks } {
    useGameTick();

    const specs = legacy.getJobRows?.() ?? [];
    const rows: JobRowData[] = [];

    for (const spec of specs) {
        const { job, servant, color } = spec;
        const civic = global.civic[job];
        if (!civic) continue;

        // unemployed keeps the settable variant even though it has a colour.
        const settable = !color || job === 'unemployed';
        const isDefault = global.civic.d_job === job;

        const display = servant
            ? (civic.display || (job === 'scavenger' && global.race.servants?.force_scavenger))
            : civic.display;

        let count: string;
        let countIsMarkup = false;
        let countClass = 'count';

        if (servant) {
            count = String(global.race.servants?.jobs?.[job] ?? 0);
        }
        else if (settable) {
            ({ count, countIsMarkup } = settableCount(job));
        }
        else {
            count = `${adjust(civic.workers, job)} / ${adjust(civic.max, job)}`;
            countClass = countClassFor(job);
        }

        rows.push({
            job,
            id: servant ? `servant-${job}` : `civ-${job}`,
            name: civic.name ?? job,
            display: !!display,
            variant: settable ? 'settable' : 'levelled',
            color: color || 'info',
            count,
            countIsMarkup,
            countClass,
            isDefault,
            // The default job's controls are pointless: it is already where
            // freed workers go. Servants have no default, so theirs always show.
            showControls: servant ? true : !isDefault,
            addLabel: `${loc('add')} ${civic.name ?? job}`,
            removeLabel: `${loc('remove')} ${civic.name ?? job}`,
        });
    }

    const isServant = useCallback(
        (job: string) => specs.find((s: any) => s.job === job)?.servant ?? false,
        [specs],
    );

    const onAdd = useCallback((job: string) => {
        if (isServant(job)) legacy.adjustServantJob?.(job, 'add');
        else legacy.adjustJob?.(job, 'add');
        notifyStateChange();
    }, [isServant]);

    const onRemove = useCallback((job: string) => {
        if (isServant(job)) legacy.adjustServantJob?.(job, 'sub');
        else legacy.adjustJob?.(job, 'sub');
        notifyStateChange();
    }, [isServant]);

    const onSetDefault = useCallback((job: string) => {
        legacy.setDefaultJob?.(job);
        notifyStateChange();
    }, []);

    return { rows, callbacks: { onAdd, onRemove, onSetDefault } };
}
