/**
 * Mount the root React App component.
 *
 * Returns a Promise that resolves once the App (including all child
 * components like GameTabs) has committed to the DOM. Legacy init
 * code should await this before accessing React-rendered elements.
 */

import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import { App } from '../App';

let mounted = false;
let readyResolve: (() => void) | null = null;

/** Called by App's useEffect once the full tree has committed. */
export function notifyAppReady() {
    if (readyResolve) {
        readyResolve();
        readyResolve = null;
    }
}

export function mountApp(): Promise<void> {
    if (mounted) return Promise.resolve();
    mounted = true;

    const container = document.createElement('div');
    container.id = 'react-root';
    document.body.prepend(container);

    const promise = new Promise<void>(resolve => {
        readyResolve = resolve;
    });

    const root = createRoot(container);
    root.render(createElement(App));

    return promise;
}
