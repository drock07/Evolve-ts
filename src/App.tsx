/**
 * Root application component.
 *
 * Sets up the game engine context. Does not render game UI directly —
 * legacy Vue/jQuery code builds the DOM imperatively. This component
 * provides the React context so that any React components mounted
 * elsewhere in the tree can access the engine.
 *
 * Children are rendered into a container div that legacy code
 * can append into.
 */

import { useEffect, useRef } from 'react';
import { GameContext } from './engine/GameContext';
import { useGameEngine } from './engine/useGameEngine';

interface AppProps {
    children?: React.ReactNode;
}

export function App({ children }: AppProps) {
    const engine = useGameEngine();

    return (
        <GameContext.Provider value={engine}>
            {children}
        </GameContext.Provider>
    );
}
