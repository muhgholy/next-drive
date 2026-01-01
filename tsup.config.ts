import { defineConfig } from 'tsup';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';

export default defineConfig({
	entry: {
		'server/index': 'src/server/index.ts',
		'server/express': 'src/server/express.ts',
		'client/index': 'src/client/index.ts',
		schemas: 'src/schemas.ts',
	},
	format: ['esm'],
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
		const cssSource = 'src/client/styles.css';
		const cssTarget = 'dist/client/styles.css';
		const cssModuleTarget = 'dist/client/styles.js';

		mkdirSync(dirname(cssTarget), { recursive: true });

		// Copy standalone CSS file for manual imports
		copyFileSync(cssSource, cssTarget);
		console.log('✓ Copied styles.css to dist');

		// Generate CSS module for auto-injection
		const cssContent = readFileSync(cssSource, 'utf-8');
		const cssModule = `// Auto-generated CSS module for runtime injection
export const styles = ${JSON.stringify(cssContent)};
`;
		writeFileSync(cssModuleTarget, cssModule);
		console.log('✓ Generated styles.js module for auto-injection');
	},
});
