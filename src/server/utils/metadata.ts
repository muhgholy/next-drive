import fs from 'fs';
import crypto from 'crypto';
import sharp from 'sharp';
import type { TImageMetadata, TVideoMetadata } from '@/types/server/metadata';

// ** File Hash

// ** Compute SHA-256 hash of a file for duplicate detection
export const computeFileHash = (filePath: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);

        stream.on('data', (data) => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
};

// ** Image Metadata

// ** Parse EXIF buffer to object
const parseExif = (exifBuffer: Buffer): Record<string, unknown> => {
    // ** Basic EXIF parsing - for more detailed parsing, use exif-parser library
    try {
        return {
            raw: exifBuffer.toString('base64'),
        };
    } catch {
        return {};
    }
};

// ** Extract image metadata using Sharp
export const extractImageMetadata = async (filePath: string): Promise<TImageMetadata | null> => {
    try {
        const metadata = await sharp(filePath).metadata();
        return {
            width: metadata.width || 0,
            height: metadata.height || 0,
            exif: metadata.exif ? parseExif(metadata.exif) : undefined,
        };
    } catch (error) {
        console.error('[next-drive] Image metadata error:', error);
        return null;
    }
};

// ** Video Metadata

// ** Extract video metadata using ffprobe
export const extractVideoMetadata = async (filePath: string): Promise<TVideoMetadata | null> => {
    try {
        const ffmpegModule = await import('./ffmpeg');
        return await ffmpegModule.getVideoMetadata(filePath);
    } catch (error) {
        console.error('[next-drive] Video metadata error:', error);
        return null;
    }
};
