import fs from 'fs';
import path from 'path';
import type { NextApiResponse } from 'next';
import sharp from 'sharp';

// ============================================
// Quality Settings
// ============================================

const QUALITY_MAP: Record<string, number> = {
    ultralow: 10,
    low: 30,
    medium: 60,
    high: 80,
    normal: 100,
};

// ============================================
// Helpers
// ============================================

/**
 * Check if MIME type is an image that can be processed
 */
export function isImageMimeType(mime: string): boolean {
    const supported = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
    return supported.includes(mime);
}

/**
 * Get Sharp format from string
 */
function getSharpFormat(format: string): 'webp' | 'jpeg' | 'png' {
    if (format === 'jpeg' || format === 'jpg') return 'jpeg';
    if (format === 'png') return 'png';
    return 'webp';
}

// ============================================
// Image Conversion
// ============================================

/**
 * Convert and serve an image with quality/format options
 */
export async function convertAndServeImage(
    sourcePath: string,
    sourceMime: string,
    quality: string,
    format: string,
    storagePath: string,
    fileId: string,
    res: NextApiResponse
): Promise<void> {
    const qualityValue = QUALITY_MAP[quality] || QUALITY_MAP.medium;
    const outputFormat = getSharpFormat(format);

    // Check cache
    const cacheDir = path.join(storagePath, 'temp', 'converted', fileId);
    const cachePath = path.join(cacheDir, `${quality}_${outputFormat}.${outputFormat}`);

    if (fs.existsSync(cachePath)) {
        const stats = fs.statSync(cachePath);
        res.setHeader('Content-Type', `image/${outputFormat}`);
        res.setHeader('Content-Length', stats.size);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        fs.createReadStream(cachePath).pipe(res);
        return;
    }

    // Convert image
    try {
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }

        const sharpInstance = sharp(sourcePath);

        switch (outputFormat) {
            case 'webp':
                sharpInstance.webp({ quality: qualityValue });
                break;
            case 'jpeg':
                sharpInstance.jpeg({ quality: qualityValue });
                break;
            case 'png':
                sharpInstance.png({ quality: qualityValue });
                break;
        }

        await sharpInstance.toFile(cachePath);

        const stats = fs.statSync(cachePath);
        res.setHeader('Content-Type', `image/${outputFormat}`);
        res.setHeader('Content-Length', stats.size);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        fs.createReadStream(cachePath).pipe(res);
    } catch (error) {
        console.error('[next-file-manager] Image conversion error:', error);
        // Fallback to original
        const stats = fs.statSync(sourcePath);
        res.setHeader('Content-Type', sourceMime);
        res.setHeader('Content-Length', stats.size);
        fs.createReadStream(sourcePath).pipe(res);
    }
}

// ============================================
// Thumbnail Generation
// ============================================

/**
 * Generate a thumbnail for an image or video
 * @returns true if successful, false if unsupported type
 */
export async function generateThumbnail(
    sourcePath: string,
    outputPath: string,
    sourceMime: string,
    size: number
): Promise<boolean> {
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Handle images with Sharp
    if (isImageMimeType(sourceMime)) {
        try {
            await sharp(sourcePath)
                .resize(size, size, { fit: 'cover', position: 'center' })
                .webp({ quality: 80 })
                .toFile(outputPath);
            return true;
        } catch (error) {
            console.error('[next-file-manager] Image thumbnail error:', error);
            return false;
        }
    }

    // Handle videos with ffmpeg
    if (sourceMime.startsWith('video/')) {
        try {
            // Dynamic import for optional ffmpeg dependency
            const { extractVideoFrame } = await import('./ffmpeg');
            return await extractVideoFrame(sourcePath, outputPath, size);
        } catch (error) {
            console.error('[next-file-manager] Video thumbnail error:', error);
            return false;
        }
    }

    return false;
}
