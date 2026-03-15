/**
 * Root application component.
 *
 * Renders the outer page skeleton that legacy Vue/jQuery code
 * appends into. Provides GameContext to all React components.
 */

import { GameContext } from './engine/GameContext';
import { useGameEngine } from './engine/useGameEngine';

export function App() {
    const engine = useGameEngine();

    return (
        <GameContext.Provider value={engine}>
            {/* Top bar — legacy Vue mounts race/calendar info here */}
            <div id="topBar" className="topBar"></div>

            {/* Main game area */}
            <div id="main" className="main">
                <div className="columns is-gapless">
                    {/* Left column: race info, queues, resources */}
                    <div className="column is-one-quarter leftColumn">
                        <div id="race" className="race colHeader"></div>
                        <div id="sideQueue">
                            <div id="buildQueue" className="bldQueue standardqueuestyle has-text-info"></div>
                            <div id="msgQueue" className="msgQueue vscroll has-text-info" aria-live="polite"></div>
                        </div>
                        <div id="resources" className="resources vscroll"></div>
                    </div>

                    {/* Center column: tabs */}
                    <div id="mainColumn" className="column is-three-quarters">
                        <div className="content"></div>
                    </div>

                    {/* Right column: queue overflow */}
                    <div id="queueColumn" className="queueCol column"></div>
                </div>
            </div>

            {/* Bottom bar — legacy code appends promo content here */}
            <div id="promoBar" className="promoBar"></div>
        </GameContext.Provider>
    );
}
