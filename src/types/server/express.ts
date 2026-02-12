// ** Server Types - Express Configuration
import type { Request } from 'express';

// ** Re-export common types
export type { TDriveConfigInformation, TDriveInformationInput, TDriveSecurityConfig, TDriveStorageConfig, TDriveDatabase, TDriveCorsConfig, TDriveMode } from './config';

// ** Base Express configuration
type TDriveConfigurationExpressBase = {
    database: 'MONGOOSE';
    storage: {
        path: string;
        google?: {
            clientId: string;
            clientSecret: string;
            redirectUri: string;
        };
    };
    cors?: {
        enabled: boolean;
        origins?: string | string[];
        methods?: string[];
        allowedHeaders?: string[];
        exposedHeaders?: string[];
        credentials?: boolean;
        maxAge?: number;
    };
    apiUrl: string;
};

// ** Normal mode Express configuration
type TDriveConfigurationExpressNormal = TDriveConfigurationExpressBase & {
    mode?: 'NORMAL';
    security: {
        maxUploadSizeInBytes: number;
        allowedMimeTypes: string[];
        signedUrls?: {
            enabled: boolean;
            secret: string;
            expiresIn: number;
        };
        trash?: { retentionDays: number };
    };
    information: (request: Request) => Promise<{
        key: Record<string, unknown> | null;
        storage: { quotaInBytes: number };
    }>;
};

// ** Root mode Express configuration
type TDriveConfigurationExpressRoot = TDriveConfigurationExpressBase & {
    mode: 'ROOT';
    security?: {
        maxUploadSizeInBytes: number;
        allowedMimeTypes: string[];
        signedUrls?: {
            enabled: boolean;
            secret: string;
            expiresIn: number;
        };
        trash?: { retentionDays: number };
    };
    information?: (request: Request) => Promise<{
        key: Record<string, unknown> | null;
        storage: { quotaInBytes: number };
    }>;
};

// ** Express configuration type (discriminated union)
export type TDriveConfigurationExpress = TDriveConfigurationExpressNormal | TDriveConfigurationExpressRoot;
