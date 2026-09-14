/**
 * Mounts a structure button into the container actions.ts builds for it.
 *
 * One island per structure, mirroring the one Vue instance per structure the
 * legacy had. The alternative — a single island per region rendering every
 * structure — would be better React, but it would mean taking over how the
 * panel is composed, and legacy code adds and removes individual structures
 * at will. This split keeps the container, its classes and its ordering
 * exactly where they are.
 */

import { createElement } from 'react';
import { mountIsland } from '../engine/islands';
import { StructureButton } from './StructureButton';
import { useStructureData, type StructureContext } from '../hooks/useStructureData';

function StructureIsland({ ctx }: { ctx: StructureContext }) {
    const { data, callbacks } = useStructureData(ctx);
    return createElement(StructureButton, { data, callbacks });
}

export function mountStructure(container: Element | null, ctx: StructureContext): boolean {
    return mountIsland(container, createElement(StructureIsland, { ctx }));
}
