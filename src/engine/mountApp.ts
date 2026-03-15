/**
 * Mount the root React App component.
 *
 * Creates a container div and mounts the App, which provides
 * the GameContext to all React components. Call this early in
 * initialization, before any React components are mounted.
 */

import { createRoot } from 'react-dom/client';
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
    root.render(createElement(App));
}
