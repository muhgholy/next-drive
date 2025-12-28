import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import formidable from 'formidable';
import type { Readable } from 'stream';
import Drive from '@/server/database/mongoose/schema/drive';
import { getDriveConfig } from '@/server/config';
import { computeFileHash, extractImageMetadata } from '@/server/utils';
import type { IDatabaseDriveDocument } from '@/server/database/mongoose/schema/drive';
import type { TDatabaseDrive } from '@/types/lib/database/drive';
import { LocalStorageProvider } from '@/server/providers/local';
import { GoogleDriveProvider } from '@/server/providers/google';

export const getNextOrderValue = async (owner: Record<string, unknown> | null): Promise<number> => {
    const lastItem = await Drive.findOne({ owner }, {}, { sort: { order: -1 } });
    return lastItem ? lastItem.order + 1 : 0;
};

export const getStorageUsed = async (owner: Record<string, unknown> | null): Promise<number> => {
    try {
        const result = await Drive.aggregate([{ $match: { owner, 'information.type': 'FILE', trashedAt: null } }, { $group: { _id: null, total: { $sum: '$information.sizeInBytes' } } }]);
        return result[0]?.total || 0;
    } catch {
        return 0;
    }
};

export const getAllFolderContents = async (folderId: string, owner: Record<string, unknown> | null, maxDepth = 50, currentDepth = 0): Promise<IDatabaseDriveDocument[]> => {
    if (currentDepth >= maxDepth) throw new Error('Maximum folder depth exceeded');

    const items = await Drive.find({ parentId: folderId, owner }).exec();
    const result: IDatabaseDriveDocument[] = [...items];

    for (const item of items) {
        if (item.information.type === 'FOLDER') {
            const subItems = await getAllFolderContents(String(item._id), owner, maxDepth, currentDepth + 1);
            result.push(...subItems);
        }
    }
    return result;
};

export const driveGetUrl = (fileId: string, options?: { expiry?: number | Date }): string => {
    const config = getDriveConfig();
    if (!config.security.signedUrls?.enabled) {
        return `/api/drive?action=serve&id=${fileId}`;
    }

    const { secret, expiresIn } = config.security.signedUrls;
    let expiryTimestamp: number;

    if (options?.expiry instanceof Date) {
        expiryTimestamp = Math.floor(options.expiry.getTime() / 1000);
    } else if (typeof options?.expiry === 'number') {
        expiryTimestamp = Math.floor(Date.now() / 1000) + options.expiry;
    } else {
        expiryTimestamp = Math.floor(Date.now() / 1000) + expiresIn;
    }

    const signature = crypto.createHmac('sha256', secret).update(`${fileId}:${expiryTimestamp}`).digest('hex');
    const token = Buffer.from(`${expiryTimestamp}:${signature}`).toString('base64url');
    return `/api/drive?action=serve&id=${fileId}&token=${token}`;
};

/**
 * Read a file and return a readable stream.
 * @param file - Either a file ID (string) or a TDatabaseDrive/IDatabaseDriveDocument object
 * @returns Promise with readable stream, mime type, and file size
 * @example
 * ```typescript
 * // Using file ID
 * const { stream, mime, size } = await driveReadFile('694f5013226de007be94fcc0');
 * stream.pipe(response);
 * 
 * // Using database document
 * const drive = await Drive.findById(fileId);
 * const { stream, mime, size } = await driveReadFile(drive);
 * ```
 */
export const driveReadFile = async (
    file: string | IDatabaseDriveDocument | TDatabaseDrive
): Promise<{ stream: Readable; mime: string; size: number }> => {
    let drive: IDatabaseDriveDocument;

    // If file is a string (ID), fetch from database
    if (typeof file === 'string') {
        const doc = await Drive.findById(file);
        if (!doc) throw new Error(`File not found: ${file}`);
        drive = doc;
    } else if ('toClient' in file) {
        // Already an IDatabaseDriveDocument (Mongoose document)
        drive = file;
    } else {
        throw new Error('Invalid file parameter provided');
    }

    if (drive.information.type !== 'FILE') {
        throw new Error('Cannot read a folder');
    }

    // Determine provider based on drive's provider type
    const provider = drive.provider?.type === 'GOOGLE' ? GoogleDriveProvider : LocalStorageProvider;
    const accountId = drive.storageAccountId?.toString();

    // Use provider's openStream method
    return await provider.openStream(drive, accountId);
};

/**
 * Get the local file system path for a file. For Google Drive files, downloads them to a local cache first.
 * @param file - Either a file ID (string) or a TDatabaseDrive/IDatabaseDriveDocument object
 * @returns Promise with readonly object containing the absolute file path and metadata
 * @example
 * ```typescript
 * // Using file ID
 * const { path, mime, size } = await driveFilePath('694f5013226de007be94fcc0');
 * const data = fs.readFileSync(path);
 * 
 * // Using database document
 * const drive = await Drive.findById(fileId);
 * const { path, name, provider } = await driveFilePath(drive);
 * await processFile(path);
 * ```
 */
export const driveFilePath = async (
    file: string | IDatabaseDriveDocument | TDatabaseDrive
): Promise<Readonly<{ path: string; name: string; mime: string; size: number; provider: string }>> => {
    let drive: IDatabaseDriveDocument;

    // If file is a string (ID), fetch from database
    if (typeof file === 'string') {
        const doc = await Drive.findById(file);
        if (!doc) throw new Error(`File not found: ${file}`);
        drive = doc;
    } else if ('toClient' in file) {
        // Already an IDatabaseDriveDocument (Mongoose document)
        drive = file;
    } else {
        throw new Error('Invalid file parameter provided');
    }

    if (drive.information.type !== 'FILE') {
        throw new Error('Cannot get path for a folder');
    }

    const config = getDriveConfig();
    const STORAGE_PATH = config.storage.path;
    const providerType = drive.provider?.type || 'LOCAL';

    // For LOCAL files, return the existing path directly
    if (providerType === 'LOCAL') {
        const filePath = path.join(STORAGE_PATH, drive.information.path);

        if (!fs.existsSync(filePath)) {
            throw new Error(`Local file not found on disk: ${filePath}`);
        }

        return Object.freeze({
            path: filePath,
            name: drive.name,
            mime: drive.information.mime,
            size: drive.information.sizeInBytes,
            provider: 'LOCAL'
        });
    }

    // For GOOGLE files, download to cache library folder
    if (providerType === 'GOOGLE') {
        const libraryDir = path.join(STORAGE_PATH, 'library', 'google');
        const fileName = `${drive._id}${path.extname(drive.name)}`;
        const cachedFilePath = path.join(libraryDir, fileName);

        // Check if already cached
        if (fs.existsSync(cachedFilePath)) {
            const stats = fs.statSync(cachedFilePath);

            // Verify cached file size matches (simple integrity check)
            if (stats.size === drive.information.sizeInBytes) {
                return Object.freeze({
                    path: cachedFilePath,
                    name: drive.name,
                    mime: drive.information.mime,
                    size: drive.information.sizeInBytes,
                    provider: 'GOOGLE'
                });
            }

            // Size mismatch, re-download
            fs.unlinkSync(cachedFilePath);
        }

        // Download from Google Drive
        const accountId = drive.storageAccountId?.toString();
        const { stream } = await GoogleDriveProvider.openStream(drive, accountId);

        // Create library directory if it doesn't exist
        if (!fs.existsSync(libraryDir)) {
            fs.mkdirSync(libraryDir, { recursive: true });
        }

        // Download to temp file first, then rename (atomic operation)
        const tempPath = `${cachedFilePath}.tmp`;
        const writeStream = fs.createWriteStream(tempPath);

        await new Promise<void>((resolve, reject) => {
            stream.pipe(writeStream);
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
            stream.on('error', reject);
        });

        // Rename temp file to final path
        fs.renameSync(tempPath, cachedFilePath);

        return Object.freeze({
            path: cachedFilePath,
            name: drive.name,
            mime: drive.information.mime,
            size: drive.information.sizeInBytes,
            provider: 'GOOGLE'
        });
    }

    throw new Error(`Unsupported provider: ${providerType}`);
};

export const processChunk = async (drive: any, chunkFile: formidable.File | formidable.File[] | undefined, chunkIndex: number, totalChunks: number, STORAGE_PATH: string) => {
    if (!chunkFile || drive.information.type !== 'FILE') return;

    const file = Array.isArray(chunkFile) ? chunkFile[0] : chunkFile;
    const destPath = path.join(STORAGE_PATH, drive.information.path);
    const chunkData = fs.readFileSync(file.filepath);

    if (chunkIndex === 0) {
        fs.writeFileSync(destPath, chunkData);
    } else {
        fs.appendFileSync(destPath, chunkData);
    }

    fs.rmSync(file.filepath, { force: true });
    drive.currentChunk = chunkIndex + 1;

    if (drive.currentChunk >= totalChunks || chunkIndex === totalChunks - 1) {
        drive.status = 'READY';
        drive.information.hash = await computeFileHash(destPath);

        if (drive.information.mime.startsWith('image/')) {
            const meta = await extractImageMetadata(destPath);
            if (meta) {
                drive.information.width = meta.width;
                drive.information.height = meta.height;
            }
        }
    }

    await drive.save();
};
