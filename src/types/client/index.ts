// ** Client Types

// ** Drive File (Public)
export type TDriveFile = {
    id: string;
    file: { name: string; mime: string; size: number };
};

// ** Image Options
export type TImageQuality = 'ultralow' | 'low' | 'medium' | 'high' | 'normal';
export type TImageFormat = 'webp' | 'jpeg' | 'png';

// ** Re-export schema from universal location
export { driveFileSchemaZod } from '../../schemas';

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
