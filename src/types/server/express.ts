// ** Server Types - Express Configuration
import type { Request } from 'express';

// ** Re-export common types
export type { TDriveConfigInformation, TDriveSecurityConfig, TDriveImageConfig, TDriveStorageConfig, TDriveDatabase, TDriveCorsConfig } from './config';

// ** Express-specific configuration type
export type TDriveConfigurationExpress = {
	database: 'MONGOOSE';
	storage: {
		path: string;
		google?: {
			clientId: string;
			clientSecret: string;
			redirectUri: string;
		};
	};
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
	image?: {
		formats: Array<'webp' | 'jpeg' | 'png'>;
		qualities: Array<'ultralow' | 'low' | 'medium' | 'high' | 'normal'>;
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
	information: (request: Request) => Promise<{
		key: Record<string, unknown> | null;
		storage: { quotaInBytes: number };
	}>;
	apiUrl: string;
};
