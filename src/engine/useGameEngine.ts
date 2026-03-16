/**
 * Core game engine hook.
 *
 * Manages game state via useReducer + Immer. Owns the web worker
 * and game loop lifecycle — the worker only starts after React
 * has mounted, eliminating race conditions.
 */

import { useReducer, useCallback, useMemo, useEffect, useRef } from 'react';
import { produce } from 'immer';
import { webWorker } from '../vars';
import { legacy } from '../hooks/legacyBridge';

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
    const workerStarted = useRef(false);

    const tick = useCallback(() => {
        dispatch({ type: 'TICK' });
    }, []);

    // Start the web worker and game loop after mount
    useEffect(() => {
        if (workerStarted.current) return;
        workerStarted.current = true;

        if (window.Worker) {
            webWorker.w = new Worker(new URL('../worker.ts', import.meta.url));
            webWorker.w.addEventListener('message', function (e) {
                const data = e.data;
                switch (data.loop) {
                    case 'main':
                        if (legacy.execGameLoops) {
                            legacy.execGameLoops(data.periods);
                        }
                        break;
                }
            }, false);
        }

        if (legacy.gameLoop) {
            legacy.gameLoop('start');
        }

        return () => {
            if (webWorker.w) {
                webWorker.w.terminate();
                webWorker.w = false;
            }
        };
    }, []);

    return useMemo(() => ({
        state,
        dispatch,
        tick,
    }), [state, dispatch, tick]);
}
