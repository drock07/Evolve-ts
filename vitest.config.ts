import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Playwright owns tests/e2e; vitest owns fast, pure unit tests.
        include: ['tests/unit/**/*.test.ts'],
        environment: 'node',
    },
});
