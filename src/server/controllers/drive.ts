import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import formidable from 'formidable';
import type { Readable } from 'stream';
import Drive from '@/server/database/mongoose/schema/drive';
import { getDriveConfig } from '@/server/config';
import { computeFileHash, extractImageMetadata, validateMimeType } from '@/server/utils';
import type { IDatabaseDriveDocument } from '@/server/database/mongoose/schema/drive';
import type { TDatabaseDrive } from '@/types/lib/database/drive';
import type { TDriveFile } from '@/types/client';
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
    if (!config.security?.signedUrls?.enabled) {
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
 * Get detailed information about a file or folder
 * @param source - Either a file/folder ID (string) or a TDriveFile object
 * @returns Promise with detailed file/folder information
 * @example
 * ```typescript
 * // Using file ID
 * const info = await driveInfo('694f5013226de007be94fcc0');
 * console.log(info.name, info.size, info.createdAt);
 * 
 * // Using TDriveFile
 * const file = { id: '123', file: { name: 'photo.jpg', mime: 'image/jpeg', size: 1024 } };
 * const info = await driveInfo(file);
 * ```
 */
export const driveInfo = async (
    source: string | TDriveFile
): Promise<import('@/types/client').TDriveInformation> => {
    const fileId = typeof source === 'string' ? source : source.id;

    const drive = await Drive.findById(fileId);
    if (!drive) throw new Error(`File not found: ${fileId}`);

    // Get parent folder name if exists
    let parentName: string | undefined;
    if (drive.parentId) {
        const parent = await Drive.findById(drive.parentId);
        if (parent) parentName = parent.name;
    }

    // Build the response
    const info: import('@/types/client').TDriveInformation = {
        id: String(drive._id),
        name: drive.name,
        type: drive.information.type,
        status: drive.status,
        provider: drive.provider,
        parent: {
            id: drive.parentId ? String(drive.parentId) : null,
            name: parentName,
        },
        createdAt: drive.createdAt,
        trashedAt: drive.trashedAt,
    };

    // Add file-specific information
    if (drive.information.type === 'FILE') {
        info.mime = drive.information.mime;
        info.size = drive.information.sizeInBytes;
        info.hash = drive.information.hash;

        // Add image dimensions if available
        if (drive.information.width && drive.information.height) {
            info.dimensions = {
                width: drive.information.width,
                height: drive.information.height,
            };
        }

        // Add video duration if available
        if (drive.information.duration) {
            info.duration = drive.information.duration;
        }
    }

    return info;
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

        // Download to temp file first, then move (atomic operation)
        const tempPath = `${cachedFilePath}.tmp`;
        const writeStream = fs.createWriteStream(tempPath);

        await new Promise<void>((resolve, reject) => {
            stream.pipe(writeStream);
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
            stream.on('error', reject);
        });

        // Move temp file to final path - handle cross-device case
        try {
            fs.renameSync(tempPath, cachedFilePath);
        } catch (err: unknown) {
            if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'EXDEV') {
                fs.copyFileSync(tempPath, cachedFilePath);
                fs.unlinkSync(tempPath);
            } else {
                throw err;
            }
        }

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

/**
 * List files and folders in a specific directory.
 * @param options - List options including owner key, folderId, limit, and afterId for pagination
 * @returns Promise with array of drive items
 * @example
 * ```typescript
 * // List root folder
 * const items = await driveList({ key: { userId: '123' } });
 * 
 * // List specific folder with limit
 * const items = await driveList({
 *   key: { userId: '123' },
 *   folderId: 'folderIdHere',
 *   limit: 50
 * });
 * 
 * // Pagination
 * const items = await driveList({
 *   key: { userId: '123' },
 *   folderId: 'root',
 *   limit: 20,
 *   afterId: 'lastItemId'
 * });
 * ```
 */
export const driveList = async (
    options: {
        key: Record<string, unknown> | null;
        folderId?: string | null;
        accountId?: string;
        limit?: number;
        afterId?: string;
    }
): Promise<TDatabaseDrive[]> => {
    const { key, folderId, accountId, limit = 100, afterId } = options;

    // Determine provider
    let providerName: 'LOCAL' | 'GOOGLE' = 'LOCAL';
    if (accountId && accountId !== 'LOCAL') {
        const account = await Drive.db.model('StorageAccount').findOne({ _id: accountId, owner: key });
        if (!account) {
            throw new Error('Invalid Storage Account');
        }
        if (account.metadata.provider === 'GOOGLE') {
            providerName = 'GOOGLE';
        }
    }

    // Build query
    const query: Record<string, unknown> = {
        owner: key,
        'provider.type': providerName,
        storageAccountId: accountId || null,
        parentId: folderId === 'root' || !folderId ? null : folderId,
        trashedAt: null,
    };

    if (afterId) {
        query._id = { $lt: afterId };
    }

    const items = await Drive.find(query, {}, { sort: { order: 1, _id: -1 }, limit });
    return await Promise.all(items.map(item => item.toClient()));
};

/**
 * Delete a file or folder permanently from the drive system.
 * @param source - File ID (string) or a TDatabaseDrive/IDatabaseDriveDocument object
 * @param options - Delete options including recurse flag
 * @returns Promise that resolves when deletion is complete
 * @example
 * ```typescript
 * // Delete a file
 * await driveDelete('694f5013226de007be94fcc0');
 * 
 * // Delete a folder recursively (default behavior)
 * await driveDelete(folderId, { recurse: true });
 * 
 * // Delete only if folder is empty
 * await driveDelete(folderId, { recurse: false }); // Throws error if folder has children
 * 
 * // Delete using database document
 * const drive = await Drive.findById(fileId);
 * await driveDelete(drive);
 * ```
 */
export const driveDelete = async (
    source: string | IDatabaseDriveDocument | TDatabaseDrive,
    options?: { recurse?: boolean }
): Promise<void> => {
    const { recurse = true } = options || {};

    let drive: IDatabaseDriveDocument;
    let driveId: string;

    // If source is a string (ID), fetch from database
    if (typeof source === 'string') {
        const doc = await Drive.findById(source);
        if (!doc) throw new Error(`File not found: ${source}`);
        drive = doc;
        driveId = source;
    } else if ('toClient' in source) {
        // Already an IDatabaseDriveDocument (Mongoose document)
        drive = source;
        driveId = String(drive._id);
    } else {
        // TDatabaseDrive object (plain object from API)
        const doc = await Drive.findById(source.id);
        if (!doc) throw new Error(`File not found: ${source.id}`);
        drive = doc;
        driveId = source.id;
    }

    // If it's a folder and recurse is false, check for children
    if (drive.information.type === 'FOLDER' && !recurse) {
        const owner = drive.owner as Record<string, unknown> | null;
        const childCount = await Drive.countDocuments({
            owner,
            parentId: driveId,
            trashedAt: null,
        });

        if (childCount > 0) {
            throw new Error(`Cannot delete folder: it contains ${childCount} item(s). Use recurse: true to delete folder and all its contents.`);
        }
    }

    // Determine provider based on drive's provider type
    const provider = drive.provider?.type === 'GOOGLE' ? GoogleDriveProvider : LocalStorageProvider;
    const accountId = drive.storageAccountId?.toString();
    const owner = drive.owner as Record<string, unknown> | null;

    // Use provider's delete method to permanently delete the file/folder
    // Note: The provider's delete method already handles recursive deletion
    await provider.delete([driveId], owner, accountId);
};

/**
 * Upload a file to the drive system from a file path or readable stream.
 * @param source - File path (string) or Readable stream
 * @param key - Owner key (must match the authenticated user's key)
 * @param options - Upload options including name, parentId, accountId, mime, and enforce flag
 * @returns Promise with the created drive file object
 * @example
 * ```typescript
 * // Upload from file path
 * const file = await driveUpload('/tmp/photo.jpg', { userId: '123' }, {
 *   name: 'photo.jpg',
 *   parentId: 'folderId',
 *   enforce: false
 * });
 * 
 * // Upload from stream with custom MIME type
 * const stream = fs.createReadStream('/tmp/video.mp4');
 * const file = await driveUpload(stream, { userId: '123' }, {
 *   name: 'video.mp4',
 *   mime: 'video/mp4',
 *   enforce: true // Skip quota check
 * });
 * 
 * // Upload from Buffer with MIME type
 * const buffer = Buffer.from('data');
 * const file = await driveUpload(buffer, { userId: '123' }, {
 *   name: 'data.bin',
 *   mime: 'application/octet-stream'
 * });
 * ```
 */
export const driveUpload = async (
    source: string | Readable | Buffer,
    key: Record<string, unknown> | null,
    options: {
        name: string;
        parentId?: string | null;
        accountId?: string;
        mime?: string;
        enforce?: boolean;
    }
): Promise<TDriveFile> => {
    const config = getDriveConfig();

    // Determine provider based on accountId
    let provider: typeof LocalStorageProvider | typeof GoogleDriveProvider = LocalStorageProvider;
    const accountId: string | undefined = options.accountId;

    if (accountId && accountId !== 'LOCAL') {
        // Validate account belongs to owner
        const account = await Drive.db.model('StorageAccount').findOne({ _id: accountId, owner: key });
        if (!account) {
            throw new Error('Invalid Storage Account');
        }
        if (account.metadata.provider === 'GOOGLE') {
            provider = GoogleDriveProvider;
        }
    }

    // Create temporary file if source is a stream or buffer
    let tempFilePath: string | null = null;
    let sourceFilePath: string;
    let fileSize: number;

    if (typeof source === 'string') {
        // Source is a file path
        if (!fs.existsSync(source)) {
            throw new Error(`Source file not found: ${source}`);
        }
        sourceFilePath = source;
        const stats = fs.statSync(source);
        fileSize = stats.size;
    } else if (Buffer.isBuffer(source)) {
        // Source is a Buffer
        const tempDir = path.join(os.tmpdir(), 'next-drive-uploads');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        tempFilePath = path.join(tempDir, `upload-${crypto.randomUUID()}.tmp`);
        fs.writeFileSync(tempFilePath, source);

        sourceFilePath = tempFilePath;
        fileSize = source.length;
    } else {
        // Source is a Readable stream
        const tempDir = path.join(os.tmpdir(), 'next-drive-uploads');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        tempFilePath = path.join(tempDir, `upload-${crypto.randomUUID()}.tmp`);
        const writeStream = fs.createWriteStream(tempFilePath);

        await new Promise<void>((resolve, reject) => {
            source.pipe(writeStream);
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
            source.on('error', reject);
        });

        sourceFilePath = tempFilePath;
        const stats = fs.statSync(tempFilePath);
        fileSize = stats.size;
    }

    try {
        // Detect MIME type from options or file extension
        let mimeType: string;

        if (options.mime) {
            // Use provided MIME type
            mimeType = options.mime;
        } else {
            // Auto-detect from file extension
            const ext = path.extname(options.name).toLowerCase();
            const mimeTypes: Record<string, string> = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.svg': 'image/svg+xml',
                '.mp4': 'video/mp4',
                '.mov': 'video/quicktime',
                '.avi': 'video/x-msvideo',
                '.pdf': 'application/pdf',
                '.doc': 'application/msword',
                '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                '.xls': 'application/vnd.ms-excel',
                '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                '.txt': 'text/plain',
                '.json': 'application/json',
                '.zip': 'application/zip',
            };
            mimeType = mimeTypes[ext] || 'application/octet-stream';
        }

        // Validate MIME type only if security config exists
        if (config.security && !validateMimeType(mimeType, config.security.allowedMimeTypes)) {
            throw new Error(`File type ${mimeType} not allowed`);
        }

        // Validate file size only if security config exists
        if (config.security && fileSize > config.security.maxUploadSizeInBytes) {
            throw new Error(`File size ${fileSize} exceeds maximum allowed size ${config.security.maxUploadSizeInBytes}`);
        }

        // Quota Check (skip in ROOT mode or if enforce is true)
        const isRootMode = config.mode === 'ROOT';
        if (!options.enforce && !isRootMode) {
            const quota = await provider.getQuota(key, accountId, undefined);
            if (quota.usedInBytes + fileSize > quota.quotaInBytes) {
                throw new Error('Storage quota exceeded');
            }
        }

        // Create Drive Document
        const drive = new Drive({
            owner: key,
            storageAccountId: accountId || null,
            provider: { type: provider.name },
            name: options.name,
            parentId: options.parentId === 'root' || !options.parentId ? null : options.parentId,
            order: await getNextOrderValue(key),
            information: { type: 'FILE', sizeInBytes: fileSize, mime: mimeType, path: '' },
            status: 'UPLOADING',
        });

        // Set initial path for LOCAL provider
        if (provider.name === 'LOCAL' && drive.information.type === 'FILE') {
            let sanitizedExt = path.extname(options.name) || '.bin';
            sanitizedExt = sanitizedExt.replace(/[^a-zA-Z0-9.]/g, '').slice(0, 11);
            if (!sanitizedExt.startsWith('.')) sanitizedExt = '.bin';
            drive.information.path = path.join(String(drive._id), `data${sanitizedExt}`);
        }

        await drive.save();

        // Upload file through provider
        try {
            const item = await provider.uploadFile(drive, sourceFilePath, accountId);
            // Return simplified TDriveFile format for public API
            return {
                id: item.id,
                file: {
                    name: item.name,
                    mime: item.information.type === 'FILE' ? item.information.mime : 'application/x-folder',
                    size: item.information.type === 'FILE' ? item.information.sizeInBytes : 0,
                },
            };
        } catch (err) {
            // Upload failed, cleanup DB record
            await Drive.deleteOne({ _id: drive._id });
            throw err;
        }
    } finally {
        // Cleanup temporary file if created from stream
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.rmSync(tempFilePath, { force: true });
        }
    }
};
