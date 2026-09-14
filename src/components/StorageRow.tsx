/**
 * A storage row — one per storable resource, in Resources > Storage.
 *
 * Ported from containerItem() in resources.ts. Each row assigns crates and
 * containers out of a global pool; assigning does not merely move a number but
 * raises that resource's storage cap, which is why the engine keeps that
 * arithmetic and this only renders it.
 *
 * A third row shape, and deliberately not forced into either of the others:
 * its steppers sit inside a labelled group, and there are two groups per row.
 */

export interface StorageGroup {
    /** Which pool this draws on: 'crate' or 'container'. */
    kind: string;
    /** Pool's display name, e.g. "Crate". */
    label: string;
    /** Assigned count. HTML: a seasonal substitution can replace it. */
    valueHtml: string;
    subLabel: string;
    addLabel: string;
}

export interface StorageRowData {
    name: string;
    color: string;
    groups: StorageGroup[];
}

export interface StorageRowCallbacks {
    onAdd: (kind: string) => void;
    onSub: (kind: string) => void;
}

export function StorageRow({ data, callbacks }: {
    data: StorageRowData;
    callbacks: StorageRowCallbacks;
}) {
    return (
        <>
            <h3 className={`res has-text-${data.color}`}>{data.name}</h3>
            {data.groups.map(group => (
                <span className="trade" key={group.kind}>
                    <span className="has-text-warning">{group.label}</span>
                    <span
                        role="button"
                        aria-label={group.subLabel}
                        className="sub has-text-danger"
                        onClick={() => callbacks.onSub(group.kind)}
                    >
                        <span>&laquo;</span>
                    </span>
                    <span className="current" dangerouslySetInnerHTML={{ __html: group.valueHtml }} />
                    <span
                        role="button"
                        aria-label={group.addLabel}
                        className="add has-text-success"
                        onClick={() => callbacks.onAdd(group.kind)}
                    >
                        <span>&raquo;</span>
                    </span>
                </span>
            ))}
        </>
    );
}
