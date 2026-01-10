import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// ** Helpers

// ** Check if MIME type is an image that can be processed
export const isImageMimeType = (mime: string): boolean => {
    const supported = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
    return supported.includes(mime);
};

// ** Thumbnail Generation

// ** Generate a thumbnail for an image or video
// ** Returns true if successful, false if unsupported type
export const generateThumbnail = async (props: Readonly<{
    sourcePath: string;
    outputPath: string;
    sourceMime: string;
    size: number;
}>): Promise<boolean> => {
    // ** Deconstruct Props
    const { sourcePath, outputPath, sourceMime, size } = props;

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // ** Handle images with Sharp
    if (isImageMimeType(sourceMime)) {
        try {
            await sharp(sourcePath)
                .resize(size, size, { fit: 'cover', position: 'center' })
                .webp({ quality: 80 })
                .toFile(outputPath);
            return true;
        } catch (error) {
            console.error('[next-drive] Image thumbnail error:', error);
            return false;
        }
    }

    // ** Handle videos with ffmpeg
    if (sourceMime.startsWith('video/')) {
        try {
            // ** Dynamic import for optional ffmpeg dependency
            const ffmpegModule = await import('./ffmpeg');
            return await ffmpegModule.extractVideoFrame({ sourcePath, outputPath, size });
        } catch (error) {
            console.error('[next-drive] Video thumbnail error:', error);
            return false;
        }
    }

    return false;
};
