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
 * Fit options for resizing (maps to Sharp's fit option)
 */
export type FitOption = 'cover' | 'contain' | 'fill' | 'inside' | 'outside';

/**
 * Position/gravity options for crop (maps to Sharp's position option)
 */
export type PositionOption = 'center' | 'top' | 'right top' | 'right' | 'right bottom' | 'bottom' | 'left bottom' | 'left' | 'left top' | 'attention' | 'entropy';

/**
 * Image optimization settings returned by getImageSettings
 */
export interface ImageSettings {
    quality: number;        // 1-100, lower = more compression
    effort: number;         // 0-9 for webp/avif, higher = slower but smaller
    pngCompression: number; // 0-9 for PNG, higher = more compression
    width?: number;         // Target width (resize)
    height?: number;        // Target height (resize)
    fit?: FitOption;        // How to fit image into dimensions
    position?: PositionOption; // Crop position when using cover fit
}

/**
 * Display presets - defines aspect ratio, base dimensions, quality factor, and default fit
 */
const DISPLAY_PRESETS: Record<string, {
    ratio: [number, number];
    baseWidth: number;
    qualityFactor: number;
    defaultFit: FitOption;
}> = {
    'article-header': { ratio: [16, 9], baseWidth: 1200, qualityFactor: 0.9, defaultFit: 'inside' },
    'article-image': { ratio: [16, 9], baseWidth: 800, qualityFactor: 0.85, defaultFit: 'inside' },
    'thumbnail': { ratio: [1, 1], baseWidth: 150, qualityFactor: 0.7, defaultFit: 'cover' },
    'avatar': { ratio: [1, 1], baseWidth: 128, qualityFactor: 0.8, defaultFit: 'cover' },
    'logo': { ratio: [2, 1], baseWidth: 200, qualityFactor: 0.95, defaultFit: 'inside' },
    'card': { ratio: [4, 3], baseWidth: 400, qualityFactor: 0.8, defaultFit: 'cover' },
    'gallery': { ratio: [1, 1], baseWidth: 600, qualityFactor: 0.85, defaultFit: 'cover' },
    'og': { ratio: [1200, 630], baseWidth: 1200, qualityFactor: 0.9, defaultFit: 'cover' },
    'icon': { ratio: [1, 1], baseWidth: 48, qualityFactor: 0.75, defaultFit: 'cover' },
    'cover': { ratio: [16, 9], baseWidth: 1920, qualityFactor: 0.9, defaultFit: 'cover' },
    'story': { ratio: [9, 16], baseWidth: 1080, qualityFactor: 0.85, defaultFit: 'cover' },
    'video': { ratio: [16, 9], baseWidth: 1280, qualityFactor: 0.85, defaultFit: 'cover' },
    'banner': { ratio: [3, 1], baseWidth: 1200, qualityFactor: 0.9, defaultFit: 'cover' },
    'portrait': { ratio: [3, 4], baseWidth: 600, qualityFactor: 0.85, defaultFit: 'inside' },
    'landscape': { ratio: [4, 3], baseWidth: 800, qualityFactor: 0.85, defaultFit: 'inside' },
};

/**
 * Valid fit options
 */
const VALID_FIT_OPTIONS: FitOption[] = ['cover', 'contain', 'fill', 'inside', 'outside'];

/**
 * Valid position options (for cover/contain)
 */
const VALID_POSITION_OPTIONS: PositionOption[] = [
    'center', 'top', 'right top', 'right', 'right bottom',
    'bottom', 'left bottom', 'left', 'left top', 'attention', 'entropy'
];

/**
 * Size scale factors - multiplies the display's baseWidth
 */
const SIZE_SCALES: Record<string, number> = {
    'xs': 0.25,
    'sm': 0.5,
    'md': 1.0,
    'lg': 1.5,
    'xl': 2.0,
    '2xl': 2.5,
};

/**
 * Standalone size presets - used when no display is specified
 */
const STANDALONE_SIZES: Record<string, { width: number; height: number }> = {
    'xs': { width: 64, height: 64 },
    'sm': { width: 128, height: 128 },
    'md': { width: 256, height: 256 },
    'lg': { width: 512, height: 512 },
    'xl': { width: 1024, height: 1024 },
    '2xl': { width: 1600, height: 1600 },
    'icon': { width: 48, height: 48 },
    'thumb': { width: 150, height: 150 },
    'square': { width: 600, height: 600 },
    'avatar-sm': { width: 64, height: 64 },
    'avatar-md': { width: 128, height: 128 },
    'avatar-lg': { width: 256, height: 256 },
    'landscape-sm': { width: 480, height: 270 },
    'landscape': { width: 800, height: 450 },
    'landscape-lg': { width: 1280, height: 720 },
    'landscape-xl': { width: 1920, height: 1080 },
    'portrait-sm': { width: 270, height: 480 },
    'portrait': { width: 450, height: 800 },
    'portrait-lg': { width: 720, height: 1280 },
    'wide': { width: 1200, height: 630 },
    'banner': { width: 1200, height: 400 },
    'banner-sm': { width: 800, height: 200 },
    'photo-4x3': { width: 800, height: 600 },
    'photo-3x2': { width: 900, height: 600 },
    'story': { width: 1080, height: 1920 },
    'video': { width: 1280, height: 720 },
    'video-sm': { width: 640, height: 360 },
    'card-sm': { width: 300, height: 200 },
    'card': { width: 400, height: 300 },
    'card-lg': { width: 600, height: 400 },
};

/**
 * Calculates all image optimization settings based on file size, quality, display, size, fit, and position.
 * 
 * @param fileSizeInBytes - Original file size in bytes
 * @param qualityPreset - Quality preset ('low', 'medium', 'high') or number (1-100)
 * @param display - Display context preset (sets aspect ratio + quality factor + default fit)
 * @param size - Size scale (xs/sm/md/lg/xl) or standalone dimension preset
 * @param fit - Fit mode (cover/contain/fill/inside/outside). Uses display default if not specified.
 * @param position - Position for cover/contain (center/top/bottom/left/right/attention/entropy)
 * @returns Complete image settings including quality, effort, dimensions, fit, and position
 */
export const getImageSettings = (
    fileSizeInBytes: number | undefined,
    qualityPreset: string | undefined,
    display: string | undefined,
    size: string | undefined,
    fit?: string,
    position?: string
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

    // 2. Calculate dimensions, quality factor, and default fit
    let width: number | undefined;
    let height: number | undefined;
    let qualityFactor = 1.0;
    let defaultFit: FitOption = 'inside';

    const displayPreset = display ? DISPLAY_PRESETS[display] : undefined;

    if (displayPreset) {
        // Display is specified - use its aspect ratio and default fit
        qualityFactor = displayPreset.qualityFactor;
        defaultFit = displayPreset.defaultFit;
        const [ratioW, ratioH] = displayPreset.ratio;

        // Apply size scale if it's a scale factor (xs/sm/md/lg/xl)
        const scale = size && SIZE_SCALES[size] ? SIZE_SCALES[size] : 1.0;
        width = Math.round(displayPreset.baseWidth * scale);
        height = Math.round(width * ratioH / ratioW);
    } else if (size) {
        // No display, check standalone sizes
        const standalone = STANDALONE_SIZES[size];
        if (standalone) {
            width = standalone.width;
            height = standalone.height;
        }
    }

    // 3. Resolve fit and position
    const resolvedFit: FitOption = fit && VALID_FIT_OPTIONS.includes(fit as FitOption)
        ? (fit as FitOption)
        : defaultFit;

    const resolvedPosition: PositionOption | undefined = position && VALID_POSITION_OPTIONS.includes(position as PositionOption)
        ? (position as PositionOption)
        : undefined;

    // Apply quality factor from display
    baseQuality = Math.round(baseQuality * qualityFactor);

    // 4. Apply file size dynamic adjustment
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

    return {
        quality: Math.max(1, Math.min(100, quality)),
        effort,
        pngCompression,
        ...(width && height && { width, height, fit: resolvedFit }),
        ...(resolvedPosition && { position: resolvedPosition }),
    };
};

// Legacy alias for backward compatibility
export const getQualitySettings = (fileSizeInBytes: number | undefined, qualityPreset: string | undefined) =>
    getImageSettings(fileSizeInBytes, qualityPreset, undefined, undefined);
