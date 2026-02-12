// ** Server Config Wrapper
import mongoose from 'mongoose';
import path from 'path';
import os from 'os';
import type { TDriveConfiguration, TDriveConfigInformation, TDriveInformationInput } from '@/types/server';
import { runMigrations } from '@/server/utils/migration';

// ** Use globalThis to persist config across all module instances
// Next.js (especially with Turbopack) creates separate SSR chunks for
// Pages Router, App Router, and Server Actions — module-level variables
// are NOT shared between them. globalThis is process-wide.
type TNextDriveGlobal = {
    config: TDriveConfiguration | null;
    migrationPromise: Promise<void> | null;
    initialized: boolean;
};

const GLOBAL_KEY = '__nextDrive' as const;

const getGlobal = (): TNextDriveGlobal => {
    if (!(globalThis as any)[GLOBAL_KEY]) {
        (globalThis as any)[GLOBAL_KEY] = {
            config: null,
            migrationPromise: null,
            initialized: false,
        };
    }
    return (globalThis as any)[GLOBAL_KEY];
};

// ** Initialize configuration
export const driveConfiguration = async (config: TDriveConfiguration): Promise<TDriveConfiguration> => {
    const g = getGlobal();

    // ** Check database connection
    if (mongoose.connection.readyState !== 1) {
        throw new Error('Database not connected. Please connect to Mongoose before initializing next-drive.');
    }

    // ** If already initialized, just wait for migration and return
    if (g.initialized && g.config) {
        if (g.migrationPromise) await g.migrationPromise;
        return g.config;
    }


    // Resolve storage path with fallback to temp dir
    const resolvedPath = config.storage?.path || path.join(os.tmpdir(), 'next-drive-data');

    const mode = config.mode || 'NORMAL';

    // ** Set config FIRST (before migrations) so it's available during migration
    if (mode === 'ROOT') {
        g.config = {
            ...config,
            mode: 'ROOT',
            storage: {
                ...config.storage,
                path: resolvedPath,
            },
            security: {
                maxUploadSizeInBytes: config.security?.maxUploadSizeInBytes ?? 1024 * 1024 * 1024 * 10, // 10GB default for ROOT
                allowedMimeTypes: config.security?.allowedMimeTypes ?? ['*/*'],
                signedUrls: config.security?.signedUrls,
                trash: config.security?.trash,
            },
        };
    } else {
        if (!config.information) {
            throw new Error('information callback is required in NORMAL mode');
        }

        g.config = {
            ...config,
            mode: 'NORMAL',
            storage: {
                ...config.storage,
                path: resolvedPath,
            },
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
    g.initialized = true;

    // ** Run migrations once (all concurrent callers share the same promise)
    if (!g.migrationPromise) {
        g.migrationPromise = runMigrations(resolvedPath);
    }
    await g.migrationPromise;

    return g.config;
};

// ** Get current configuration
export const getDriveConfig = (): TDriveConfiguration => {
    const g = getGlobal();
    if (!g.config) throw new Error('Drive configuration not initialized');
    return g.config;
};

// ** Get drive information (quota, owner) - Accepts REQUEST (from API handler) or KEY (from server-side code)
export const getDriveInformation = async (input: TDriveInformationInput): Promise<TDriveConfigInformation> => {
    const config = getDriveConfig();

    // In ROOT mode, return null key if information callback is not provided
    if (config.mode === 'ROOT') {
        if (!config.information) {
            return {
                key: input.method === 'KEY' ? input.key : null,
                storage: { quotaInBytes: Number.MAX_SAFE_INTEGER } // Unlimited quota in ROOT mode
            };
        }
        return config.information(input);
    }

    // NORMAL mode - information is guaranteed to exist
    return config.information(input);
};

