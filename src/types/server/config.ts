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

// ** CORS configuration
export type TDriveCorsConfig = {
    enabled: boolean;
    origins?: string | string[]; // Allowed origins (default: '*')
    methods?: string[]; // Allowed methods (default: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
    allowedHeaders?: string[]; // Allowed headers
    exposedHeaders?: string[]; // Headers to expose
    credentials?: boolean; // Allow credentials
    maxAge?: number; // Preflight cache duration in seconds
};

// ** Main configuration type
export type TDriveConfiguration = {
    database: TDriveDatabase;
    storage: TDriveStorageConfig;
    security: TDriveSecurityConfig;
    image?: TDriveImageConfig;
    cors?: TDriveCorsConfig;
    information: (request: NextApiRequest) => Promise<TDriveConfigInformation>;
    apiUrl: string;
};
