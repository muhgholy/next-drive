// ** Client Types
import { z } from 'zod';

// ** Drive File (Public)
export type TDriveFile = {
    id: string;
    file: { name: string; mime: string; size: number };
};

// ** Image Options
export type TImageQuality = 'ultralow' | 'low' | 'medium' | 'high' | 'normal';
export type TImageFormat = 'webp' | 'jpeg' | 'png';

// ** Drive File Schema (for validation)
export const driveFileSchemaZod = z.object({
    id: z.string(),
    file: z.object({
        name: z.string(),
        mime: z.string(),
        size: z.number(),
    }),
});

// ** Context Types
export type TDrivePathItem = {
    id: string | null;
    name: string;
};

export type TDriveQuota = {
    usedInBytes: number;
    totalInBytes: number;
    availableInBytes: number;
    percentage: number;
};

// ** Upload State
export type TDriveUploadState = {
    id: string;
    name: string;
    size: number;
    status: 'pending' | 'queued' | 'uploading' | 'complete' | 'error' | 'cancelled';
    currentChunk: number;
    totalChunks: number;
    driveId?: string;
    error?: string;
};
