/**
 * TopBar — pure presentational component.
 *
 * Displays planet name, universe, calendar info, pause button, and version.
 */

export interface CalendarData {
    year: number;
    day: number;
    season: string;
    weather: string;
    temp: string;
    moon: string;
    astroSign: string;
    astroSignLabel: string;
}

export interface TopBarData {
    planetName: string;
    universeName: string | null;
    isSimulation: boolean;
    showPet: boolean;
    calendar: CalendarData | null;
    isPaused: boolean;
    version: string;
    infoTimer: string | null;
    acceleratedTime: string | null;
}

export interface TopBarCallbacks {
    onPause: () => void;
    onPetClick?: () => void;
}

export function TopBar({ data, callbacks }: { data: TopBarData; callbacks: TopBarCallbacks }) {
    return (
        <>
            <h2 className="is-sr-only">Top Bar</h2>
            <span className="planetWrap">
                <span className="planet">{data.planetName}</span>
                {data.universeName && (
                    <span className="universe">{data.universeName}</span>
                )}
                {data.showPet && (
                    <span className="pet" id="playerPet" onClick={callbacks.onPetClick}></span>
                )}
                {data.isSimulation && (
                    <span className="simulation">Simulation</span>
                )}
            </span>
            <span className="calendar">
                {data.infoTimer && (
                    <span className="infoTimer" id="infoTimer">{data.infoTimer}</span>
                )}
                {data.calendar && data.calendar.day > 0 && (
                    <span>
                        <span className="is-sr-only">{data.calendar.astroSignLabel}</span>
                        <span id="astroSign" className="astro" dangerouslySetInnerHTML={{ __html: data.calendar.astroSign }}></span>
                        <i id="moon" className="moon wi" title={data.calendar.moon}></i>
                        <span className="year">Year <span className="has-text-warning">{data.calendar.year}</span></span>
                        <span className="day">Day <span className="has-text-warning">{data.calendar.day}</span></span>
                        <span className="season">{data.calendar.season}</span>
                        <i id="weather" className="weather wi" title={data.calendar.weather}></i>
                        <i id="temp" className="temp wi" title={data.calendar.temp}></i>
                        {data.acceleratedTime && (
                            <span className="atime has-text-caution">{data.acceleratedTime}</span>
                        )}
                        <span
                            role="button"
                            className="atime"
                            style={{ padding: '0 0.5rem', marginLeft: '0.5rem', cursor: 'pointer' }}
                            onClick={callbacks.onPause}
                            aria-label={data.isPaused ? 'Play' : 'Pause'}
                        >
                            <span id="pausegame" className={data.isPaused ? 'pause' : 'play'}></span>
                        </span>
                    </span>
                )}
            </span>
            <span className="version" id="versionLog">
                <a href="wiki.html#changelog" target="_blank">{data.version}</a>
            </span>
        </>
    );
}
