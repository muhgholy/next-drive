import { defineConfig } from 'tsup';
import { copyFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export default defineConfig({
    entry: {
        'server/index': 'src/server/index.ts',
        'client/index': 'src/client/index.ts',
        'schemas': 'src/schemas.ts',
    },
    format: ['esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    external: ['react', 'react-dom', 'next', 'mongoose', 'fluent-ffmpeg', 'sharp', 'googleapis'],
    esbuildOptions(options) {
        options.jsx = 'automatic';
    },
    onSuccess: async () => {
        // Copy CSS file to dist
        const cssSource = 'src/client/styles.css';
        const cssTarget = 'dist/client/styles.css';
        mkdirSync(dirname(cssTarget), { recursive: true });
        copyFileSync(cssSource, cssTarget);
        console.log('✓ Copied styles.css to dist');
    },
});
