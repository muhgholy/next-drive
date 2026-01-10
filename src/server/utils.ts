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
