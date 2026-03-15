/**
 * Core game engine hook.
 *
 * Manages game state via useReducer + Immer. Provides a dispatch
 * function for state mutations and a tick function for the game loop.
 */

import { useReducer, useCallback, useMemo } from 'react';
import { produce } from 'immer';

// ── State ──

export interface GameState {
    /** Monotonically increasing tick counter */
    tick: number;
}

const initialState: GameState = {
    tick: 0,
};

// ── Actions ──

export type GameAction =
    | { type: 'TICK' };

// ── Reducer ──

function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
        case 'TICK':
            return produce(state, draft => {
                draft.tick++;
            });

        default:
            return state;
    }
}

// ── Hook ──

export function useGameEngine() {
    const [state, dispatch] = useReducer(gameReducer, initialState);

    const tick = useCallback(() => {
        dispatch({ type: 'TICK' });
    }, []);

    return useMemo(() => ({
        state,
        dispatch,
        tick,
    }), [state, dispatch, tick]);
}
