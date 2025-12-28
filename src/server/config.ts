// ** Server Config Wrapper
import type { NextApiRequest } from 'next';
import mongoose from 'mongoose';
import type { TDriveConfiguration, TDriveConfigInformation } from '@/types/server';

let globalConfig: TDriveConfiguration | null = null;

// ** Initialize configuration
export const driveConfiguration = (config: TDriveConfiguration): TDriveConfiguration => {
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
        throw new Error('Database not connected. Please connect to Mongoose before initializing next-file-manager.');
    }

    // Apply default values if not provided in the config
    const mergedConfig: TDriveConfiguration = {
        ...config,
        security: {
            maxUploadSizeInBytes: config.security?.maxUploadSizeInBytes ?? 10 * 1024 * 1024, // Default to 10MB
            allowedMimeTypes: config.security?.allowedMimeTypes ?? ['*/*'],
            signedUrls: config.security?.signedUrls,
            trash: config.security?.trash
        },
        information: config.information ?? (async (req) => {
            return {
                key: { id: 'default-user' },
                storage: { quotaInBytes: 10 * 1024 * 1024 * 1024 } // Default to 10GB
            };
        }),
    };

    globalConfig = mergedConfig;
    return mergedConfig;
};

// ** Get current configuration
export const getDriveConfig = (): TDriveConfiguration => {
    if (!globalConfig) throw new Error('Drive configuration not initialized');
    return globalConfig;
};

// ** Get drive information (quota, owner)
export const getDriveInformation = async (req: NextApiRequest): Promise<TDriveConfigInformation> => {
    const config = getDriveConfig();
    return config.information(req);
};
