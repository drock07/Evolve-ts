import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'fs';

/**
 * The container ships a Chromium build that may not match the revision this
 * Playwright version would download. When that prebuilt binary is present we
 * point at it directly rather than fetching a second copy.
 */
const PREBUILT_CHROMIUM = [
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/opt/pw-browsers/chromium/chrome-linux/chrome',
].find(existsSync);
const launchOptions = PREBUILT_CHROMIUM ? { executablePath: PREBUILT_CHROMIUM } : {};

export default defineConfig({
    testDir: './tests/e2e',
    // The golden-master run simulates thousands of game days in one page.
    timeout: 180_000,
    expect: { timeout: 15_000 },
    // Deterministic snapshots are worthless if a retry can mask a real diff.
    retries: 0,
    // The engine is a singleton per page; parallel pages are fine, but keep
    // the worker count modest since each one boots the whole 600KB bundle.
    workers: 2,
    reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
    use: {
        baseURL: 'http://127.0.0.1:4173',
        trace: 'retain-on-failure',
        launchOptions,
    },
    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                // Clear the channel: it would make Playwright resolve its own
                // (absent) browser build and ignore executablePath above.
                channel: undefined,
                launchOptions,
            },
        },
    ],
    webServer: {
        // Test the built artifact, not the dev server — the production build
        // is what regressions actually ship in.
        command: 'pnpm run build && pnpm exec vite preview --port 4173 --strictPort',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
    },
});
