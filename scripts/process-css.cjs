#!/usr/bin/env node
/**
 * Process CSS to remove Tailwind v4-specific syntax
 */
const fs = require('fs');
const postcss = require('postcss');
const postcssV3Compat = require('./postcss-v3-compat.cjs');
const cssnano = require('cssnano');

const inputFile = process.argv[2];
const outputFile = process.argv[3];

if (!inputFile || !outputFile) {
    console.error('Usage: node process-css.cjs <input> <output>');
    process.exit(1);
}

const css = fs.readFileSync(inputFile, 'utf-8');

postcss([postcssV3Compat(), cssnano({ preset: 'default' })])
    .process(css, { from: inputFile, to: outputFile })
    .then((result) => {
        // Replace Tailwind internal --tw- variables with --nd-tw- for full isolation
        const processedCss = result.css.replace(/--tw-/g, '--nd-tw-');
        fs.writeFileSync(outputFile, processedCss);
        if (result.map) {
            fs.writeFileSync(outputFile + '.map', result.map.toString());
        }
        console.log(`✓ Processed CSS: ${inputFile} → ${outputFile}`);
    })
    .catch((error) => {
        console.error('CSS processing failed:', error);
        process.exit(1);
    });
