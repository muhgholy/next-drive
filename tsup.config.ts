import { defineConfig } from 'tsup';
import { copyFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export default defineConfig({
    entry: {
        'server/index': 'src/server/index.ts',
        'server/express': 'src/server/express.ts',
        'client/index': 'src/client/index.ts',
        schemas: 'src/schemas.ts',
    },
    format: ['esm', 'cjs'],
    dts: false, // Use tsc separately - tsup's DTS uses too much memory
    splitting: true, // Enable code splitting to share state (like globalConfig) across entry points
    sourcemap: true,
    clean: true,
    treeshake: true,
    external: ['react', 'react-dom', 'next', 'mongoose', 'fluent-ffmpeg', 'sharp', 'googleapis', 'express'],
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
