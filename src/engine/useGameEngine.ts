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
import { isE2E } from './e2e';

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

        if (isE2E()) {
            // Under the test driver the worker is a stub that accepts messages
            // and delivers no ticks. The driver calls execGameLoops itself and
            // needs exclusive control of time.
            //
            // Stubbing the worker rather than skipping the one gameLoop('start')
            // below is deliberate: the loop is restarted from several places,
            // including from inside the loop itself when accelerated time runs
            // out (see the restartNeeded branch in main.ts). Those restarts
            // revived a real worker behind the driver's back, and the ticks it
            // then fired raced with the test — which is what made the golden
            // masters disagree intermittently by a few ticks' worth of
            // resources. A stub cannot be revived into something that ticks.
            webWorker.w = {
                postMessage() {},
                terminate() {},
                addEventListener() {},
                removeEventListener() {},
            } as unknown as Worker;
        }
        else if (window.Worker) {
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
