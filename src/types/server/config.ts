// ** Server Types - Configuration
import type { NextApiRequest } from 'next';

// ** Database Types
export type TDriveDatabase = "MONGOOSE";

// ** Information returned from configuration callback
export type TDriveConfigInformation = {
    key: Record<string, unknown> | null;
    storage: { quotaInBytes: number };
};

// ** Security configuration
export type TDriveSecurityConfig = {
    maxUploadSizeInBytes: number;
    allowedMimeTypes: string[];
    signedUrls?: {
        enabled: boolean;
        secret: string;
        expiresIn: number;
    };
    trash?: { retentionDays: number };
};

// ** Image processing configuration
export type TDriveImageConfig = {
    formats: Array<"webp" | "jpeg" | "png">;
    qualities: Array<"ultralow" | "low" | "medium" | "high" | "normal">;
};

// ** Storage configuration
export type TDriveStorageConfig = {
    path: string;
    google?: {
        clientId: string;
        clientSecret: string;
        redirectUri: string;
    };
};

// ** Main configuration type
export type TDriveConfiguration = {
    database: TDriveDatabase;
    storage: TDriveStorageConfig;
    security: TDriveSecurityConfig;
    image?: TDriveImageConfig;
    information: (request: NextApiRequest) => Promise<TDriveConfigInformation>;
    apiUrl: string;
};
