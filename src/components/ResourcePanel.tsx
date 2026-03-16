/**
 * ResourcePanel — pure presentational component.
 *
 * Renders a list of resources from props. Has no knowledge of the
 * game engine, global state, or legacy code.
 */

import { ResourceRow, ResourceRowData, ResourceRowCallbacks } from './ResourceRow';

export interface ResourcePanelItem {
    resource: ResourceRowData;
    callbacks?: ResourceRowCallbacks;
}

export interface ResourcePanelProps {
    /** Screen-reader label for the panel */
    label?: string;
    /** Ordered list of resources to display */
    resources: ResourcePanelItem[];
}

export function ResourcePanel({ label, resources }: ResourcePanelProps) {
    return (
        <>
            {label && <h2 className="is-sr-only">{label}</h2>}
            {resources.map(item => (
                <ResourceRow
                    key={item.resource.id}
                    resource={item.resource}
                    callbacks={item.callbacks}
                />
            ))}
        </>
    );
}
