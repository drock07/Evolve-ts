/**
 * React context for the game engine.
 *
 * Provides state and dispatch to any component in the tree.
 */

import { createContext, useContext } from 'react';
import { GameState, GameAction } from './useGameEngine';

export interface GameContextValue {
    state: GameState;
    dispatch: React.Dispatch<GameAction>;
    tick: () => void;
}

export const GameContext = createContext<GameContextValue | null>(null);

/**
 * Access the game engine state and dispatch from any React component.
 * Must be used inside a <GameContext.Provider>.
 */
export function useGame(): GameContextValue {
    const ctx = useContext(GameContext);
    if (!ctx) {
        throw new Error('useGame must be used within a GameContext.Provider');
    }
    return ctx;
}
