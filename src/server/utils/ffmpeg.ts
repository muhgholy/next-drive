import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';

// ============================================
// Video Frame Extraction
// ============================================

/**
 * Extract a single frame from video for thumbnail
 */
export async function extractVideoFrame(
    sourcePath: string,
    outputPath: string,
    size: number
): Promise<boolean> {
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
                // Convert to webp for consistency
                if (fs.existsSync(outputPath)) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            })
            .on('error', (err) => {
                console.error('[next-file-manager] ffmpeg error:', err);
                resolve(false);
            });
    });
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
 * Get video metadata using ffprobe
 */
export async function getVideoMetadata(
    filePath: string
): Promise<VideoMetadata | null> {
    return new Promise((resolve) => {
        ffmpeg.ffprobe(filePath, (err, data) => {
            if (err) {
                console.error('[next-file-manager] ffprobe error:', err);
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
}
