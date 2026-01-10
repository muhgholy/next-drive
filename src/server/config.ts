// ** Server Config Wrapper
import type { NextApiRequest } from 'next';
import mongoose from 'mongoose';
import type { TDriveConfiguration, TDriveConfigInformation } from '@/types/server';
import { runMigrations } from '@/server/utils/migration';

let globalConfig: TDriveConfiguration | null = null;
let migrationRun = false;

// ** Initialize configuration
export const driveConfiguration = async (config: TDriveConfiguration): Promise<TDriveConfiguration> => {
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
        throw new Error('Database not connected. Please connect to Mongoose before initializing next-drive.');
    }

    // ** Run migrations once on first initialization
    if (!migrationRun) {
        await runMigrations(config.storage.path);
        migrationRun = true;
    }

    const mode = config.mode || 'NORMAL';

    // Apply default values based on mode
    if (mode === 'ROOT') {
        // ROOT mode: All fields optional with sensible defaults
        globalConfig = {
            ...config,
            mode: 'ROOT',
            security: config.security || {
                maxUploadSizeInBytes: 1024 * 1024 * 1024 * 10, // 10GB default for ROOT
                allowedMimeTypes: ['*/*'],
            },
        };
        return globalConfig;
    } else {
        // NORMAL mode: Ensure required fields are present
        if (!config.information) {
            throw new Error('information callback is required in NORMAL mode');
        }

        globalConfig = {
            ...config,
            mode: 'NORMAL',
            security: {
                maxUploadSizeInBytes: config.security?.maxUploadSizeInBytes ?? 10 * 1024 * 1024,
                allowedMimeTypes: config.security?.allowedMimeTypes ?? ['*/*'],
                signedUrls: config.security?.signedUrls,
                trash: config.security?.trash
            },
            information: config.information,
        };
        return globalConfig;
    }
};

// ** Get current configuration
export const getDriveConfig = (): TDriveConfiguration => {
    if (!globalConfig) throw new Error('Drive configuration not initialized');
    return globalConfig;
};

// ** Get drive information (quota, owner) - Returns null key in ROOT mode
export const getDriveInformation = async (req: NextApiRequest): Promise<TDriveConfigInformation> => {
    const config = getDriveConfig();

    // In ROOT mode, return null key if information callback is not provided
    if (config.mode === 'ROOT') {
        if (!config.information) {
            return {
                key: null,
                storage: { quotaInBytes: Number.MAX_SAFE_INTEGER } // Unlimited quota in ROOT mode
            };
        }
        return config.information(req);
    }

    // NORMAL mode - information is guaranteed to exist
    return config.information(req);
};
