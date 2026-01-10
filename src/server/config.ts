// ** Server Config Wrapper
import type { NextApiRequest } from 'next';
import mongoose from 'mongoose';
import type { TDriveConfiguration, TDriveConfigInformation } from '@/types/server';
import { runMigrations } from '@/server/utils/migration';

let globalConfig: TDriveConfiguration | null = null;
let migrationPromise: Promise<void> | null = null;
let configInitialized = false;

// ** Initialize configuration
export const driveConfiguration = async (config: TDriveConfiguration): Promise<TDriveConfiguration> => {
    // ** Check database connection
    if (mongoose.connection.readyState !== 1) {
        throw new Error('Database not connected. Please connect to Mongoose before initializing next-drive.');
    }

    // ** If already initialized, just wait for migration and return
    if (configInitialized && globalConfig) {
        if (migrationPromise) await migrationPromise;
        return globalConfig;
    }

    const mode = config.mode || 'NORMAL';

    // ** Set globalConfig FIRST (before migrations) so it's available during migration
    if (mode === 'ROOT') {
        globalConfig = {
            ...config,
            mode: 'ROOT',
            security: config.security || {
                maxUploadSizeInBytes: 1024 * 1024 * 1024 * 10, // 10GB default for ROOT
                allowedMimeTypes: ['*/*'],
            },
        };
    } else {
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
    }

    // ** Mark as initialized immediately to prevent race conditions
    configInitialized = true;

    // ** Run migrations once (all concurrent callers share the same promise)
    if (!migrationPromise) {
        migrationPromise = runMigrations(config.storage.path);
    }
    await migrationPromise;

    return globalConfig;
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
