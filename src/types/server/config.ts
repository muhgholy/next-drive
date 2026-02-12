// ** Server Types - Configuration
import type { NextApiRequest } from 'next';

// ** Database Types
export type TDriveDatabase = 'MONGOOSE';

// ** Drive mode
export type TDriveMode = 'NORMAL' | 'ROOT';

// ** Information resolution input (how to resolve owner + quota)
export type TDriveInformationInput =
    | { method: 'REQUEST'; req: NextApiRequest }
    | { method: 'KEY'; key: Record<string, unknown> | null };

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

// ** Base configuration
type TDriveConfigurationBase = {
    database: TDriveDatabase;
    storage: TDriveStorageConfig;
    cors?: TDriveCorsConfig;
    apiUrl: string;
};

// ** Normal mode configuration (requires authentication)
type TDriveConfigurationNormal = TDriveConfigurationBase & {
    mode?: 'NORMAL';
    security: TDriveSecurityConfig;
    information: (input: TDriveInformationInput) => Promise<TDriveConfigInformation>;
};

// ** Root mode configuration (no authentication, no limits)
type TDriveConfigurationRoot = TDriveConfigurationBase & {
    mode: 'ROOT';
    security?: TDriveSecurityConfig;
    information?: (input: TDriveInformationInput) => Promise<TDriveConfigInformation>;
};

// ** Main configuration type (discriminated union)
export type TDriveConfiguration = TDriveConfigurationNormal | TDriveConfigurationRoot;
