/**
 * The job list — Civics > Government.
 *
 * Replaces one Vue instance per job with a single React list. Rows come in two
 * variants, decided by whether the job was loaded with a colour:
 *
 *  - settable: the name is a link that makes the job the default, marked `*`
 *    while it is, and the count is a plain number. The default job's own
 *    controls are hidden, since it is where spare workers already go.
 *  - levelled: a coloured heading and a "workers / max" count whose class
 *    reflects how full the job is.
 */

export interface JobRowData {
    job: string;
    /** DOM id the legacy stylesheet and tests expect: civ-<job> / servant-<job>. */
    id: string;
    name: string;
    /** False while the job is not yet unlocked; the row stays but is hidden. */
    display: boolean;
    variant: 'settable' | 'levelled';
    /** Buefy colour suffix for the heading, e.g. 'advanced'. */
    color: string;
    /** Pre-rendered count. Markup when an easter egg replaces a zero. */
    count: string;
    countIsMarkup: boolean;
    /** Class for the count span — carries the fill level on levelled rows. */
    countClass: string;
    /** True when this job is the current default. */
    isDefault: boolean;
    /** Whether the add/remove controls show. */
    showControls: boolean;
    addLabel: string;
    removeLabel: string;
}

export interface JobListCallbacks {
    onAdd: (job: string) => void;
    onRemove: (job: string) => void;
    onSetDefault: (job: string) => void;
}

function JobRow({ row, callbacks }: { row: JobRowData; callbacks: JobListCallbacks }) {
    const count = row.countIsMarkup
        ? <span className={row.countClass} dangerouslySetInnerHTML={{ __html: row.count }} />
        : <span className={row.countClass}>{row.count}</span>;

    return (
        <div id={row.id} className="job" style={row.display ? undefined : { display: 'none' }}>
            <div className="job_label">
                {row.variant === 'settable'
                    ? (
                        <h3>
                            <a
                                className={`has-text-${row.color}`}
                                onClick={() => callbacks.onSetDefault(row.job)}
                            >
                                {row.name}{row.isDefault ? '*' : ''}
                            </a>
                        </h3>
                    )
                    : <h3 className={`has-text-${row.color}`}>{row.name}</h3>}
                {count}
            </div>
            <div className="controls" style={row.showControls ? undefined : { display: 'none' }}>
                <span
                    role="button"
                    aria-label={row.removeLabel}
                    className="sub has-text-danger"
                    onClick={() => callbacks.onRemove(row.job)}
                >
                    <span>&laquo;</span>
                </span>
                <span
                    role="button"
                    aria-label={row.addLabel}
                    className="add has-text-success"
                    onClick={() => callbacks.onAdd(row.job)}
                >
                    <span>&raquo;</span>
                </span>
            </div>
        </div>
    );
}

export function JobList({ rows, callbacks }: { rows: JobRowData[]; callbacks: JobListCallbacks }) {
    return (
        <>
            {rows.map(row => <JobRow key={row.id} row={row} callbacks={callbacks} />)}
        </>
    );
}
