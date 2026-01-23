import { defineConfig } from 'tsup';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, readdirSync } from 'fs';

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

        // Read the processed CSS content
        const cssContent = readFileSync('dist/client/index.css', 'utf-8');
        const escapedCss = JSON.stringify(cssContent);

        // Inject CSS via placeholder replacement in ALL JS bundles (main and chunks)
        const distDir = 'dist/client';
        readdirSync(distDir).forEach((file) => {
            if (file.endsWith('.js') || file.endsWith('.cjs')) {
                const filePath = `${distDir}/${file}`;
                const content = readFileSync(filePath, 'utf-8');
                // Check if file contains placeholder before replacing
                if (content.includes('__ND_STYLES_PLACEHOLDER__')) {
                    // Replace placeholder (handles both single and double quoted strings from tsup)
                    const newContent = content.replace(/['"]__ND_STYLES_PLACEHOLDER__['"]/, escapedCss);
                    writeFileSync(filePath, newContent);
                    console.log(`✓ Injected styles into ${file}`);
                }
            }
        });

        console.log('✓ Compiled Tailwind CSS with v3 compatibility AND injected component-scoped styles');
    },
});
