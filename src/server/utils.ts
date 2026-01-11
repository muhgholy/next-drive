import fs from 'fs';
import crypto from 'crypto';
import sharp from 'sharp';

export const isImageMimeType = (mime: string): boolean => ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(mime);

export const validateMimeType = (mime: string, allowedTypes: string[]): boolean => {
    if (allowedTypes.includes('*/*')) return true;
    return allowedTypes.some(pattern => {
        if (pattern === mime) return true;
        if (pattern.endsWith('/*')) {
            const prefix = pattern.slice(0, -2);
            return mime.startsWith(`${prefix}/`);
        }
        return false;
    });
};

export const computeFileHash = (filePath: string): Promise<string> =>
    new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('data', data => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });

export const extractImageMetadata = async (filePath: string) => {
    try {
        const { width = 0, height = 0, exif } = await sharp(filePath).metadata();
        return { width, height, ...(exif && { exif: { raw: exif.toString('base64') } }) };
    } catch {
        return null;
    }
};

export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const ownerMatches = (a: Record<string, unknown> | null, b: Record<string, unknown> | null): boolean => {
    if (a === null && b === null) return true;
    if (a === null || b === null) return false;
    return JSON.stringify(a) === JSON.stringify(b);
};

/**
 * Image optimization settings returned by getImageSettings
 */
export interface ImageSettings {
    quality: number;        // 1-100, lower = more compression
    effort: number;         // 0-9 for webp/avif, higher = slower but smaller
    pngCompression: number; // 0-9 for PNG, higher = more compression
    width?: number;         // Max width (resize)
    height?: number;        // Max height (resize)
}

/**
 * Display presets - affects quality factor based on use case context
 */
const DISPLAY_PRESETS: Record<string, number> = {
    'article-header': 0.9,   // Hero/banner images - high quality
    'article-image': 0.85,   // In-content images
    'thumbnail': 0.7,        // Small previews - lower quality ok
    'avatar': 0.8,           // Profile pictures
    'logo': 0.95,            // Branding - needs clarity
    'card': 0.8,             // Card components
    'gallery': 0.85,         // Gallery/grid images
    'og': 0.9,               // Open Graph/social sharing
    'icon': 0.75,            // Small icons
    'cover': 0.9,            // Full-width covers
    'story': 0.85,           // Story/vertical format
};

/**
 * Size presets - predefined dimensions (no custom sizes to prevent abuse)
 */
const SIZE_PRESETS: Record<string, { width: number; height: number }> = {
    // Square sizes
    'xs': { width: 64, height: 64 },
    'sm': { width: 128, height: 128 },
    'md': { width: 256, height: 256 },
    'lg': { width: 512, height: 512 },
    'xl': { width: 1024, height: 1024 },
    '2xl': { width: 1600, height: 1600 },

    // Named squares
    'icon': { width: 48, height: 48 },
    'thumb': { width: 150, height: 150 },
    'square': { width: 600, height: 600 },
    'avatar-sm': { width: 64, height: 64 },
    'avatar-md': { width: 128, height: 128 },
    'avatar-lg': { width: 256, height: 256 },

    // Landscape (16:9)
    'landscape-sm': { width: 480, height: 270 },
    'landscape': { width: 800, height: 450 },
    'landscape-lg': { width: 1280, height: 720 },
    'landscape-xl': { width: 1920, height: 1080 },

    // Portrait (9:16)
    'portrait-sm': { width: 270, height: 480 },
    'portrait': { width: 450, height: 800 },
    'portrait-lg': { width: 720, height: 1280 },

    // Wide/Banner (OG, social)
    'wide': { width: 1200, height: 630 },      // Open Graph standard
    'banner': { width: 1200, height: 400 },    // Banner/header
    'banner-sm': { width: 800, height: 200 },

    // Classic photo ratios
    'photo-4x3': { width: 800, height: 600 },  // 4:3
    'photo-3x2': { width: 900, height: 600 },  // 3:2

    // Story/vertical (9:16)
    'story': { width: 1080, height: 1920 },

    // Video thumbnails
    'video': { width: 1280, height: 720 },
    'video-sm': { width: 640, height: 360 },

    // Card sizes
    'card-sm': { width: 300, height: 200 },
    'card': { width: 400, height: 300 },
    'card-lg': { width: 600, height: 400 },
};

/**
 * Calculates all image optimization settings based on file size, quality, display, and size.
 * 
 * @param fileSizeInBytes - Original file size in bytes
 * @param qualityPreset - Quality preset ('low', 'medium', 'high') or number (1-100)
 * @param display - Display context preset for quality adjustment
 * @param size - Size preset for dimensions
 * @returns Complete image settings including quality, effort, and optional dimensions
 */
export const getImageSettings = (
    fileSizeInBytes: number | undefined,
    qualityPreset: string | undefined,
    display: string | undefined,
    size: string | undefined
): ImageSettings => {
    // 1. Parse base quality from preset
    let baseQuality = 80;
    if (qualityPreset === 'low') baseQuality = 30;
    else if (qualityPreset === 'medium') baseQuality = 50;
    else if (qualityPreset === 'high') baseQuality = 75;
    else if (qualityPreset) {
        const n = parseInt(qualityPreset, 10);
        if (!isNaN(n)) baseQuality = Math.min(100, Math.max(1, n));
    }

    // 2. Apply display quality factor
    const displayFactor = display && DISPLAY_PRESETS[display] ? DISPLAY_PRESETS[display] : 1.0;
    baseQuality = Math.round(baseQuality * displayFactor);

    // 3. Apply file size dynamic adjustment
    let quality = baseQuality;
    let effort = 4;
    let pngCompression = 6;

    if (fileSizeInBytes) {
        const sizeInKB = fileSizeInBytes / 1024;

        if (sizeInKB > 500) {
            quality = Math.min(baseQuality, 25);
            effort = 9;
            pngCompression = 9;
        } else if (sizeInKB > 300) {
            quality = Math.min(baseQuality, 30);
            effort = 8;
            pngCompression = 9;
        } else if (sizeInKB > 150) {
            quality = Math.min(baseQuality, 35);
            effort = 7;
            pngCompression = 8;
        } else if (sizeInKB > 90) {
            quality = Math.min(baseQuality, 40);
            effort = 6;
            pngCompression = 8;
        } else if (sizeInKB > 50) {
            quality = Math.min(baseQuality, 50);
            effort = 5;
            pngCompression = 7;
        }
    }

    // 4. Get dimensions from size preset
    const dimensions = size && SIZE_PRESETS[size] ? SIZE_PRESETS[size] : undefined;

    return {
        quality: Math.max(1, Math.min(100, quality)),
        effort,
        pngCompression,
        ...(dimensions && { width: dimensions.width, height: dimensions.height }),
    };
};

// Legacy alias for backward compatibility
export const getQualitySettings = (fileSizeInBytes: number | undefined, qualityPreset: string | undefined) =>
    getImageSettings(fileSizeInBytes, qualityPreset, undefined, undefined);
