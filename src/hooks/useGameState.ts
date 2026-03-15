import { useSyncExternalStore } from 'react';
import { subscribe, getSnapshot } from '../state';
import { global } from '../vars';

/**
 * Subscribe to game tick updates and select a slice of game state.
 *
 * The selector runs on every game tick — keep it cheap (direct property access).
 * React will only re-render if the selector returns a referentially different value.
 *
 * @example
 * // Re-renders when any game state changes (use sparingly)
 * const g = useGameState(() => global);
 *
 * @example
 * // Re-renders on tick but only reads what it needs
 * const food = useGameState(() => global.resource.Food.amount);
 *
 * @example
 * // Derive a value — will re-render every tick since a new object is created.
 * // For objects, prefer useGameTick() + read directly in render.
 * const stats = useGameState(() => ({
 *     day: global.stats.days,
 *     pop: global.resource[global.race.species]?.amount ?? 0,
 * }));
 */
export function useGameState<T>(selector: () => T): T {
    useSyncExternalStore(subscribe, getSnapshot);
    return selector();
}

/**
 * Subscribe to game tick updates without selecting state.
 * The component will re-render on every game tick.
 * Read from `global` directly in your render function.
 *
 * @example
 * function ResourceDisplay() {
 *     useGameTick();
 *     return <span>{global.resource.Food.amount}</span>;
 * }
 */
export function useGameTick(): void {
    useSyncExternalStore(subscribe, getSnapshot);
}
