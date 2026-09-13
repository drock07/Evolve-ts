/**
 * Mounts the job list into the #jobs container defineJobs() builds.
 *
 * One island for the whole list, where the original had one Vue instance per
 * job. Servant rows share the component but render into #servants.
 */

import { createElement } from 'react';
import { mountIsland } from '../engine/islands';
import { JobList } from './JobList';
import { useJobsData } from '../hooks/useJobsData';

function JobsIsland({ servant }: { servant: boolean }) {
    const { rows, callbacks } = useJobsData();
    return createElement(JobList, {
        rows: rows.filter(r => r.id.startsWith(servant ? 'servant-' : 'civ-')),
        callbacks,
    });
}

export function mountJobs(): boolean {
    const civ = mountIsland(
        document.getElementById('jobs'),
        createElement(JobsIsland, { servant: false }),
    );
    // #servants only exists once the species has them.
    mountIsland(
        document.getElementById('servants'),
        createElement(JobsIsland, { servant: true }),
    );
    return civ;
}
