
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['test/integration/**/*.test.ts'],
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
        testTimeout: 30000, // 30s timeout for real network requests
    },
});
