// ** Client Types

// ** Drive File (Public)
export type TDriveFile = {
    id: string;
    file: { name: string; mime: string; size: number };
};

// ** Drive Information (Detailed file/folder info)
export type TDriveInformation = {
    id: string;
    name: string;
    type: 'FILE' | 'FOLDER';
    mime?: string;
    size?: number;
    hash?: string;
    dimensions?: { width: number; height: number };
    duration?: number;
    status: 'READY' | 'PROCESSING' | 'UPLOADING' | 'FAILED';
    provider: {
        type: 'LOCAL' | 'GOOGLE';
        google?: {
            id: string;
            webViewLink?: string;
            iconLink?: string;
            thumbnailLink?: string;
        };
    };
    parent?: { id: string | null; name?: string };
    createdAt: Date;
    trashedAt?: Date | null;
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
    logs?: Array<{ type: 'info' | 'warning' | 'error' | 'success'; message: string; timestamp: number }>;
};
