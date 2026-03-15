/**
 * Mount the root React App component.
 *
 * Renders the App synchronously (via flushSync) so the DOM skeleton
 * is available immediately for legacy code to append into.
 */

import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { createElement } from 'react';
import { App } from '../App';

let mounted = false;

export function mountApp() {
    if (mounted) return;
    mounted = true;

    const container = document.createElement('div');
    container.id = 'react-root';
    document.body.prepend(container);

    const root = createRoot(container);
    flushSync(() => {
        root.render(createElement(App));
    });
}
