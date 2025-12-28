import fs from 'fs';
import crypto from 'crypto';
import sharp from 'sharp';

// ============================================
// File Hash
// ============================================

/**
 * Compute SHA-256 hash of a file for duplicate detection
 */
export async function computeFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);

        stream.on('data', (data) => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
}

// ============================================
// Image Metadata
// ============================================

export interface ImageMetadata {
    width: number;
    height: number;
    exif?: Record<string, unknown>;
}

/**
 * Extract image metadata using Sharp
 */
export async function extractImageMetadata(
    filePath: string
): Promise<ImageMetadata | null> {
    try {
        const metadata = await sharp(filePath).metadata();
        return {
            width: metadata.width || 0,
            height: metadata.height || 0,
            exif: metadata.exif ? parseExif(metadata.exif) : undefined,
        };
    } catch (error) {
        console.error('[next-file-manager] Image metadata error:', error);
        return null;
    }
}

/**
 * Parse EXIF buffer to object
 */
function parseExif(exifBuffer: Buffer): Record<string, unknown> {
    // Basic EXIF parsing - for more detailed parsing, use exif-parser library
    try {
        // Return as base64 for now, could be expanded with exif-parser
        return {
            raw: exifBuffer.toString('base64'),
        };
    } catch {
        return {};
    }
}

// ============================================
// Video Metadata
// ============================================

export interface VideoMetadata {
    width: number;
    height: number;
    duration: number;
}

/**
 * Extract video metadata using ffprobe
 */
export async function extractVideoMetadata(
    filePath: string
): Promise<VideoMetadata | null> {
    try {
        const { getVideoMetadata } = await import('./ffmpeg');
        return await getVideoMetadata(filePath);
    } catch (error) {
        console.error('[next-file-manager] Video metadata error:', error);
        return null;
    }
}
