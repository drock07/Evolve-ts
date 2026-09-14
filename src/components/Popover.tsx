/**
 * Hover descriptions, the React half of the popover system.
 *
 * The legacy popover() binds jQuery handlers to a selector and builds its
 * content imperatively into a single global #popper element. That works fine
 * on React-rendered nodes — it attaches by selector without taking ownership —
 * but it cannot show React content, so every ported widget has had to leave
 * its descriptions behind in Vue templates rendered inside the popover body.
 *
 * This is the replacement. It is a hook rather than a wrapper component on
 * purpose: the stylesheet selects on the exact shape of the legacy markup
 * (`.tactics > span.current.tactic` and friends), so a wrapper element around
 * the trigger would change layout. Spreading props onto the element that
 * already exists changes nothing.
 *
 * Only one description is ever visible, across both systems. The legacy one
 * enforces that for itself by calling clearPopper() before it opens; this hook
 * calls the same function, and clearPopper() in turn closes whatever this hook
 * has open. Neither system needs to know how the other renders.
 */

import {
    useCallback, useEffect, useLayoutEffect, useRef, useState,
    type ReactNode, type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { createPopper, type Instance, type Placement } from '@popperjs/core';
import { clearPopper, registerReactPopoverCloser } from '../functions';

export interface PopoverOptions {
    /** Where to put it relative to the trigger. Matches the legacy default. */
    placement?: Placement;
    /** Extra classes on the popover body, replacing the default set. */
    classes?: string;
    /** The legacy `wide` flag, which the stylesheet keys off. */
    wide?: boolean;
    /** Popper offset, as [skid, distance]. */
    offset?: [number, number];
    /**
     * Identifier, exposed as data-id. clearPopper(id) uses it to close one
     * specific description rather than whatever happens to be open.
     */
    id?: string;
}

const DEFAULT_CLASSES = 'has-background-light has-text-dark pop-desc';

/**
 * The open popover's closer.
 *
 * A module-level single slot rather than per-hook state, because "one at a
 * time" is a property of the page, not of any one trigger.
 */
let closeActive: ((id?: string) => void) | null = null;

/**
 * Let the legacy clearPopper() close a React popover too.
 *
 * Registered once, at module load. Without this, hovering a legacy-bound
 * element while a React description is open would leave both on screen.
 */
registerReactPopoverCloser((id?: string) => {
    closeActive?.(id);
});

/** The element React popovers are portalled into. Created on first use. */
function popoverHost(): HTMLElement {
    let host = document.getElementById('reactPopoverHost');
    if (!host) {
        host = document.createElement('div');
        host.id = 'reactPopoverHost';
        // Appended to #main so the `.main > div.popper` rules apply, the same
        // place the legacy popper is appended.
        (document.getElementById('main') ?? document.body).appendChild(host);
    }
    return host;
}

function PopoverBody({ anchor, opts, children }: {
    anchor: RefObject<HTMLElement | null>;
    opts: PopoverOptions;
    children: ReactNode;
}) {
    const ref = useRef<HTMLDivElement>(null);

    // Positioned in a layout effect so it is placed before the browser paints;
    // in a plain effect the popover is briefly visible at the wrong spot.
    useLayoutEffect(() => {
        const el = ref.current;
        const target = anchor.current;
        if (!el || !target) return;

        const instance: Instance = createPopper(target, el, {
            placement: opts.placement ?? 'bottom',
            modifiers: [
                { name: 'flip', enabled: true },
                { name: 'offset', options: { offset: opts.offset ?? [0, 0] } },
            ],
        });
        return () => instance.destroy();
    }, [anchor, opts.placement, opts.offset]);

    const classes = [
        'popper',
        opts.wide ? 'wide' : '',
        opts.classes ?? DEFAULT_CLASSES,
    ].filter(Boolean).join(' ');

    return (
        <div ref={ref} className={classes} data-id={opts.id} role="tooltip">
            {children}
        </div>
    );
}

/**
 * Attach a hover description to an element.
 *
 * Returns props to spread onto the trigger and a node to render. The node has
 * to be rendered by the caller because React will not mount a portal that is
 * not part of some tree; it produces no markup where it sits.
 */
export function usePopover(content: () => ReactNode, opts: PopoverOptions = {}) {
    const [open, setOpen] = useState(false);
    const anchor = useRef<HTMLElement | null>(null);

    const close = useCallback(() => setOpen(false), []);

    const onMouseOver = useCallback(() => {
        // Closes the legacy popover, and through the registered closer any
        // other React one, before taking the slot.
        clearPopper();
        setOpen(true);
    }, []);

    useEffect(() => {
        if (!open) return;

        const closer = (id?: string) => {
            // clearPopper(id) targets one description; anything else closes
            // whatever is open.
            if (id === undefined || id === opts.id) setOpen(false);
        };
        closeActive = closer;

        return () => {
            if (closeActive === closer) closeActive = null;
        };
    }, [open, opts.id]);

    // A trigger that unmounts while showing its description would otherwise
    // strand it: the portal goes with this hook, but the slot would not.
    useEffect(() => () => {
        setOpen(false);
    }, []);

    return {
        triggerProps: {
            ref: anchor as RefObject<any>,
            onMouseOver,
            onMouseOut: close,
        },
        popover: open
            ? createPortal(
                <PopoverBody anchor={anchor} opts={opts}>{content()}</PopoverBody>,
                popoverHost(),
            )
            : null,
    };
}
