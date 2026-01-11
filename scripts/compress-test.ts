#!/usr/bin/env npx ts-node
/**
 * Image Compression Test Script
 * 
 * Tests the dynamic quality compression settings with before/after comparison.
 * 
 * Usage:
 *   npx ts-node scripts/compress-test.ts <image-path> [quality-preset]
 *   
 * Examples:
 *   npx ts-node scripts/compress-test.ts ./test-image.jpg
 *   npx ts-node scripts/compress-test.ts ./test-image.png medium
 *   npx ts-node scripts/compress-test.ts ./test-image.webp low
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Copy the getQualitySettings logic for standalone use
interface QualitySettings {
    quality: number;
    effort: number;
    pngCompression: number;
}

const getQualitySettings = (fileSizeInBytes: number | undefined, qualityPreset: string | undefined): QualitySettings => {
    let baseQuality = 80;
    if (qualityPreset === 'low') baseQuality = 30;
    else if (qualityPreset === 'medium') baseQuality = 50;
    else if (qualityPreset === 'high') baseQuality = 75;
    else if (qualityPreset) {
        const n = parseInt(qualityPreset, 10);
        if (!isNaN(n)) baseQuality = Math.min(100, Math.max(1, n));
    }

    if (!fileSizeInBytes) {
        return { quality: baseQuality, effort: 4, pngCompression: 6 };
    }

    const sizeInKB = fileSizeInBytes / 1024;

    if (sizeInKB > 500) {
        return { quality: Math.min(baseQuality, 25), effort: 9, pngCompression: 9 };
    } else if (sizeInKB > 300) {
        return { quality: Math.min(baseQuality, 30), effort: 8, pngCompression: 9 };
    } else if (sizeInKB > 150) {
        return { quality: Math.min(baseQuality, 35), effort: 7, pngCompression: 8 };
    } else if (sizeInKB > 90) {
        return { quality: Math.min(baseQuality, 40), effort: 6, pngCompression: 8 };
    } else if (sizeInKB > 50) {
        return { quality: Math.min(baseQuality, 50), effort: 5, pngCompression: 7 };
    }

    return { quality: baseQuality, effort: 4, pngCompression: 6 };
};

const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

const getReductionPercent = (original: number, compressed: number): string => {
    const reduction = ((original - compressed) / original) * 100;
    return reduction.toFixed(1);
};

interface CompressionResult {
    format: string;
    preset: string;
    originalSize: number;
    compressedSize: number;
    settings: QualitySettings;
    outputPath: string;
}

async function compressImage(
    inputPath: string,
    outputDir: string,
    format: 'jpeg' | 'webp' | 'avif' | 'png',
    preset: string
): Promise<CompressionResult> {
    const originalStats = fs.statSync(inputPath);
    const originalSize = originalStats.size;
    const settings = getQualitySettings(originalSize, preset);

    const baseName = path.basename(inputPath, path.extname(inputPath));
    const outputPath = path.join(outputDir, `${baseName}_${preset}_q${settings.quality}_e${settings.effort}.${format}`);

    let pipeline = sharp(inputPath);

    switch (format) {
        case 'jpeg':
            pipeline = pipeline.jpeg({ quality: settings.quality, mozjpeg: true });
            break;
        case 'webp':
            // WebP effort is 0-6, not 0-9
            pipeline = pipeline.webp({ quality: settings.quality, effort: Math.min(settings.effort, 6) });
            break;
        case 'avif':
            // AVIF effort is 0-9
            pipeline = pipeline.avif({ quality: settings.quality, effort: settings.effort });
            break;
        case 'png':
            pipeline = pipeline.png({ compressionLevel: settings.pngCompression, adaptiveFiltering: true });
            break;
    }

    await pipeline.toFile(outputPath);

    const compressedStats = fs.statSync(outputPath);

    return {
        format,
        preset,
        originalSize,
        compressedSize: compressedStats.size,
        settings,
        outputPath
    };
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           Image Compression Test Script                       ║
╠═══════════════════════════════════════════════════════════════╣
║ Usage:                                                        ║
║   npx ts-node scripts/compress-test.ts <image> [preset]       ║
║                                                               ║
║ Presets: low, medium, high, or numeric (1-100)                ║
║                                                               ║
║ Examples:                                                     ║
║   npx ts-node scripts/compress-test.ts ./photo.jpg            ║
║   npx ts-node scripts/compress-test.ts ./photo.png medium     ║
╚═══════════════════════════════════════════════════════════════╝
`);
        process.exit(1);
    }

    const inputPath = path.resolve(args[0]);
    const presets = args[1] ? [args[1]] : ['low', 'medium', 'high'];

    if (!fs.existsSync(inputPath)) {
        console.error(`\n❌ File not found: ${inputPath}\n`);
        process.exit(1);
    }

    const originalStats = fs.statSync(inputPath);
    const originalSize = originalStats.size;

    // Create output directory
    const outputDir = path.join(path.dirname(inputPath), 'compressed_output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           Dynamic Image Compression Test                      ║
╚═══════════════════════════════════════════════════════════════╝

📁 Input:  ${inputPath}
📊 Original Size: ${formatBytes(originalSize)}
📂 Output: ${outputDir}
`);

    const formats: Array<'jpeg' | 'webp' | 'avif'> = ['jpeg', 'webp', 'avif'];
    const results: CompressionResult[] = [];

    console.log('🔄 Compressing...\n');

    for (const preset of presets) {
        for (const format of formats) {
            try {
                const result = await compressImage(inputPath, outputDir, format, preset);
                results.push(result);
            } catch (err) {
                console.error(`   ❌ Failed ${format}/${preset}: ${(err as Error).message}`);
            }
        }
    }

    // Display results table
    console.log('┌──────────┬──────────┬──────────────┬──────────────┬──────────┬─────────────────────┐');
    console.log('│ Format   │ Preset   │ Original     │ Compressed   │ Saved    │ Settings            │');
    console.log('├──────────┼──────────┼──────────────┼──────────────┼──────────┼─────────────────────┤');

    for (const r of results) {
        const format = r.format.toUpperCase().padEnd(8);
        const preset = r.preset.padEnd(8);
        const original = formatBytes(r.originalSize).padEnd(12);
        const compressed = formatBytes(r.compressedSize).padEnd(12);
        const saved = `${getReductionPercent(r.originalSize, r.compressedSize)}%`.padEnd(8);
        const settings = `q${r.settings.quality} e${r.settings.effort}`.padEnd(19);

        console.log(`│ ${format} │ ${preset} │ ${original} │ ${compressed} │ ${saved} │ ${settings} │`);
    }

    console.log('└──────────┴──────────┴──────────────┴──────────────┴──────────┴─────────────────────┘');

    // Find best result
    if (results.length > 0) {
        const best = results.reduce((a, b) => a.compressedSize < b.compressedSize ? a : b);
        console.log(`
🏆 Best Compression: ${best.format.toUpperCase()} with "${best.preset}" preset
   ${formatBytes(best.originalSize)} → ${formatBytes(best.compressedSize)} (${getReductionPercent(best.originalSize, best.compressedSize)}% reduction)
   Settings: quality=${best.settings.quality}, effort=${best.settings.effort}
   Output: ${best.outputPath}
`);
    }
}

main().catch(console.error);
