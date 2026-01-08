// ** Express Adapter for next-drive
// ** Provides Express-compatible types for the drive API handler and configuration
import type { Request, Response } from 'express';
import type { TDriveConfigurationExpress } from '@/types/server/express';

import { driveAPIHandler, driveConfiguration } from '@/server/index';

// ** Express API Handler
// ** Type-cast wrapper that allows Express Request/Response to be used with the core handler
export const driveAPIHandlerExpress = driveAPIHandler as unknown as (req: Request, res: Response) => Promise<void>;

// ** Express Configuration
// ** Type-cast wrapper that accepts Express Request in the information callback
export const driveConfigurationExpress = driveConfiguration as unknown as (config: TDriveConfigurationExpress) => TDriveConfigurationExpress;

// ** Re-export utilities that work with any framework
export { driveGetUrl, driveReadFile, driveFilePath, driveUpload, driveDelete, driveList } from '@/server/controllers/drive';
export { driveFileSchemaZod } from '@/server/zod/schemas';
export { getDriveConfig } from '@/server/config';

// ** Re-export types
export type { TDriveConfigurationExpress, TDriveConfigInformation } from '@/types/server/express';
export type { TDriveFile, TImageQuality, TImageFormat } from '@/types/client';
