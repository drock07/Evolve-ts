/**
 * Foundry (crafters) panel — Civics > Government.
 *
 * Replaces the Vue instance on #foundry / #skilledServants. One row per
 * unlocked craftable, above them a header showing how many crafters are
 * assigned out of the cap.
 */

export interface CrafterRowData {
    res: string;
    /** DOM id the popovers and stylesheet expect: craft<Res> / scraft<Res>. */
    id: string;
    name: string;
    /** Usually the assigned count; "n / cap" for the two capped craftables. */
    count: string;
    addLabel: string;
    removeLabel: string;
}

export interface FoundryData {
    /** False when no foundry exists yet; the panel renders nothing. */
    display: boolean;
    title: string;
    /** "assigned / max". */
    assigned: string;
    /** Fill-level class for the assigned count. */
    assignedClass: string;
    rows: CrafterRowData[];
}

export interface FoundryCallbacks {
    onAdd: (res: string) => void;
    onRemove: (res: string) => void;
}

export function FoundryPanel({ data, callbacks }: { data: FoundryData; callbacks: FoundryCallbacks }) {
    if (!data.display) return null;

    return (
        <>
            <div className="job">
                <div className="foundry job_label">
                    <h3 className="has-text-warning">{data.title}</h3>
                    <span className={data.assignedClass}>{data.assigned}</span>
                </div>
            </div>
            {data.rows.map(row => (
                <div className="job" key={row.id}>
                    <div id={row.id} className="job_label">
                        <h3 className="has-text-danger">{row.name}</h3>
                        <span className="count">{row.count}</span>
                    </div>
                    <div className="controls">
                        <span
                            role="button"
                            aria-label={row.removeLabel}
                            className="sub has-text-danger"
                            onClick={() => callbacks.onRemove(row.res)}
                        >
                            <span>&laquo;</span>
                        </span>
                        <span
                            role="button"
                            aria-label={row.addLabel}
                            className="add has-text-success"
                            onClick={() => callbacks.onAdd(row.res)}
                        >
                            <span>&raquo;</span>
                        </span>
                    </div>
                </div>
            ))}
        </>
    );
}
