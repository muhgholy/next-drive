import { defineConfig } from 'tsup';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

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
        const tempCss = 'dist/client/index.temp.css';

        // Step 1: Compile with Tailwind v4 (generates utility classes from components)
        execSync(`npx @tailwindcss/cli -i src/client/styles.build.css -o ${tempCss}`, {
            stdio: 'inherit',
        });

        // Step 2: Process with PostCSS to remove v4-specific syntax and minify
        execSync(`node scripts/process-css.cjs ${tempCss} dist/client/index.css`, {
            stdio: 'inherit',
        });

        // Clean up temp file
        execSync(`rm ${tempCss}`);

        // Inject CSS import at the top of the JS files so styles auto-load
        const esmFile = 'dist/client/index.js';
        const cjsFile = 'dist/client/index.cjs';

        const esmContent = readFileSync(esmFile, 'utf-8');
        if (!esmContent.includes('./index.css')) {
            writeFileSync(esmFile, `import './index.css';\n${esmContent}`);
        }

        const cjsContent = readFileSync(cjsFile, 'utf-8');
        if (!cjsContent.includes('./index.css')) {
            writeFileSync(cjsFile, `require('./index.css');\n${cjsContent}`);
        }

        console.log('✓ Compiled Tailwind CSS with v3 compatibility');
    },
});
