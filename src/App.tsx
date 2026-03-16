/**
 * Root application component.
 *
 * Renders the full page structure. Tab panels are either React
 * components or empty divs that legacy code mounts into.
 */

import { useEffect, useCallback, useState } from 'react';
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/react';
import { GameContext } from './engine/GameContext';
import { useGameEngine } from './engine/useGameEngine';
import { notifyAppReady } from './engine/mountApp';
import { ResourcePanel } from './components/ResourcePanel';
import { EvolutionTab } from './components/EvolutionTab';
import { TopBar } from './components/TopBar';
import { RacePanel } from './components/RacePanel';
import { useResourceData } from './hooks/useResourceData';
import { useEvolutionData } from './hooks/useEvolutionData';
import { useTopBarData } from './hooks/useTopBarData';
import { useRacePanelData } from './hooks/useRacePanelData';
import { global } from './vars';
import { loc } from './locale';

function GameTab({ visible, label }: { visible: boolean; label: string }) {
    return (
        <Tab
            as="li"
            className={({ selected }) => selected ? 'is-active' : ''}
            style={visible ? undefined : { display: 'none' }}
        >
            <a>{label}</a>
        </Tab>
    );
}

export function App() {
    const engine = useGameEngine();
    const resources = useResourceData();
    const evolutionActions = useEvolutionData();
    const topBar = useTopBarData();
    const racePanel = useRacePanelData();
    const [selectedTab, setSelectedTab] = useState(global.settings.civTabs || 0);

    useEffect(() => {
        notifyAppReady();
    }, []);

    // Sync tab selection from global (for legacy code that changes it)
    useEffect(() => {
        const interval = setInterval(() => {
            if (global.settings.civTabs !== selectedTab) {
                setSelectedTab(global.settings.civTabs);
            }
        }, 250);
        return () => clearInterval(interval);
    }, [selectedTab]);

    const handleTabChange = useCallback((index: number) => {
        setSelectedTab(index);
        global.settings.civTabs = index;
    }, []);

    // Tab visibility based on game progress
    const showTab = (key: string | null): boolean => {
        if (key === null) return true;
        return !!global.settings[key];
    };

    return (
        <GameContext.Provider value={engine}>
            {/* Top bar */}
            <div id="topBar" className="topBar">
                <TopBar data={topBar.data} callbacks={topBar.callbacks} />
            </div>

            {/* Main game area */}
            <div id="main" className="main">
                <div className="columns is-gapless">
                    {/* Left column */}
                    <div className="column is-one-quarter leftColumn">
                        <div id="race" className="race colHeader">
                            <RacePanel data={racePanel} />
                        </div>
                        <div id="sideQueue">
                            <div id="buildQueue" className="bldQueue standardqueuestyle has-text-info"></div>
                            <div id="msgQueue" className="msgQueue vscroll has-text-info" aria-live="polite"></div>
                        </div>
                        <div id="resources" className="resources vscroll">
                            <ResourcePanel label="Resources" resources={resources} />
                        </div>
                    </div>

                    {/* Center column */}
                    <div id="mainColumn" className="column is-three-quarters">
                        <div className="content">
                            <TabGroup selectedIndex={selectedTab} onChange={handleTabChange}>
                                <h2 className="is-sr-only">Tab Navigation</h2>
                                <TabList as="div" className="tabs">
                                    <ul>
                                        <GameTab visible={showTab('showEvolve')} label={loc('tab_evolve')} />
                                        <GameTab visible={showTab('showCiv')} label={loc('tab_civil')} />
                                        <GameTab visible={showTab('showCivic')} label={loc('tab_civics')} />
                                        <GameTab visible={showTab('showResearch')} label={loc('tab_research')} />
                                        <GameTab visible={showTab('showResources')} label={loc('tab_resources')} />
                                        <GameTab visible={showTab('showGenetics')} label={loc('tech_arpa')} />
                                        <GameTab visible={showTab('showAchieve')} label={loc('tab_stats')} />
                                        <GameTab visible={true} label={loc('tab_settings')} />
                                    </ul>
                                </TabList>
                                <TabPanels>
                                    {/* Evolution — React component */}
                                    <TabPanel id="evolution" className="tab-item sticky">
                                        <EvolutionTab actions={evolutionActions} />
                                    </TabPanel>

                                    {/* City — legacy mounts here */}
                                    <TabPanel><div id="mTabCivil"></div></TabPanel>

                                    {/* Civics — legacy mounts here */}
                                    <TabPanel><div id="mTabCivic"></div></TabPanel>

                                    {/* Research — legacy mounts here */}
                                    <TabPanel><div id="mTabResearch"></div></TabPanel>

                                    {/* Resources — legacy mounts here */}
                                    <TabPanel><div id="mTabResource"></div></TabPanel>

                                    {/* ARPA — legacy mounts here */}
                                    <TabPanel><div id="mTabArpa"></div></TabPanel>

                                    {/* Stats — legacy mounts here */}
                                    <TabPanel><div id="mTabStats"></div></TabPanel>

                                    {/* Settings — legacy mounts here */}
                                    <TabPanel><div id="mTabSettings"></div></TabPanel>
                                </TabPanels>
                            </TabGroup>
                        </div>
                    </div>

                    {/* Right column */}
                    <div id="queueColumn" className="queueCol column"></div>
                </div>
            </div>

            {/* Bottom bar */}
            {/* TODO: Easter egg #15 — during Easter, the title shows "Ev[egg icon]lve"
                instead of "Evolve". Original: easterEgg(15,8) from functions.ts */}
            <div className="promoBar">
                <span className="left">
                    <h1>
                        <span className="has-text-warning">Evolve</span>
                        {' '}by{' '}
                        <span className="has-text-success">Demagorddon</span>
                    </h1>
                </span>
                <span className="right">
                    <h2 className="is-sr-only">External Links</h2>
                    <ul className="external-links">
                        <li><a href="wiki.html" target="_blank">Wiki</a></li>
                        <li><a href="https://www.reddit.com/r/EvolveIdle/" target="_blank">Reddit</a></li>
                        <li><a href="https://discord.gg/dcwdQEr" target="_blank">Discord</a></li>
                        <li><a href="https://github.com/pmotschmann/Evolve" target="_blank">GitHub</a></li>
                        <li><a href="https://www.patreon.com/demagorddon" target="_blank">Patreon</a></li>
                        <li><a href="https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=PTRJZBW9J662C&currency_code=USD&source=url" target="_blank">Donate</a></li>
                    </ul>
                </span>
            </div>
        </GameContext.Provider>
    );
}
