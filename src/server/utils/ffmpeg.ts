import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import type { TVideoMetadata } from '@/types/server/metadata';

// ** Video Frame Extraction

// ** Extract a single frame from video for thumbnail
export const extractVideoFrame = (props: Readonly<{
    sourcePath: string;
    outputPath: string;
    size: number;
}>): Promise<boolean> => {
    // ** Deconstruct Props
    const { sourcePath, outputPath, size } = props;

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    return new Promise((resolve) => {
        ffmpeg(sourcePath)
            .screenshots({
                count: 1,
                folder: outputDir,
                filename: path.basename(outputPath),
                size: `${size}x${size}`,
                timemarks: ['00:00:01'],
            })
            .on('end', () => {
                // ** Convert to webp for consistency
                if (fs.existsSync(outputPath)) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            })
            .on('error', (err) => {
                console.error('[next-drive] ffmpeg error:', err);
                resolve(false);
            });
    });
};

// ** Video Metadata

// ** Get video metadata using ffprobe
export const getVideoMetadata = (filePath: string): Promise<TVideoMetadata | null> => {
    return new Promise((resolve) => {
        ffmpeg.ffprobe(filePath, (err, data) => {
            if (err) {
                console.error('[next-drive] ffprobe error:', err);
                resolve(null);
                return;
            }

            const videoStream = data.streams.find((s) => s.codec_type === 'video');
            if (!videoStream) {
                resolve(null);
                return;
            }

            resolve({
                width: videoStream.width || 0,
                height: videoStream.height || 0,
                duration: data.format.duration || 0,
            });
        });
    });
};
