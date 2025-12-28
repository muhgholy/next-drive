import { defineConfig } from 'tsup';

export default defineConfig({
    entry: {
        'server/index': 'src/server/index.ts',
        'client/index': 'src/client/index.ts',
    },
    format: ['esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    external: ['react', 'react-dom', 'next', 'mongoose', 'fluent-ffmpeg', 'sharp'],
    esbuildOptions(options) {
        options.jsx = 'automatic';
    },
});
