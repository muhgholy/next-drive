import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import Drive from '@/server/database/mongoose/schema/drive';
import { getDriveConfig } from '@/server/config';
import { extractImageMetadata, computeFileHash } from '@/server/utils';
import type { TStorageProvider } from '@/types/server/storage';
import type { IDatabaseDriveDocument } from '@/server/database/mongoose/schema/drive';
import ffmpeg from 'fluent-ffmpeg';
import sharp from 'sharp';

export const LocalStorageProvider: TStorageProvider = {
    name: 'LOCAL',

    sync: async (folderId, owner, accountId) => {
        // No-op for local storage as DB is the source of truth
    },

    search: async (query, owner, accountId) => {
        // No-op for local storage as DB text search handles it
    },

    getQuota: async (owner, accountId, configuredQuotaInBytes) => {
        // Calculate storage used from DB
        const result = await Drive.aggregate([{ $match: { owner, 'information.type': 'FILE', trashedAt: null } }, { $group: { _id: null, total: { $sum: '$information.sizeInBytes' } } }]);
        const usedInBytes = result[0]?.total || 0;

        // Use configured quota from user's information callback (required)
        return { usedInBytes, quotaInBytes: configuredQuotaInBytes ?? 0 };
    },

    openStream: async (item: IDatabaseDriveDocument, accountId?: string) => {
        if (item.information.type !== 'FILE') throw new Error('Cannot stream folder');
        const filePath = path.join(getDriveConfig().storage.path, item.information.path);

        if (!fs.existsSync(filePath)) {
            throw new Error('File not found on disk');
        }

        const stat = fs.statSync(filePath);
        const stream = fs.createReadStream(filePath);

        return {
            stream,
            mime: item.information.mime,
            size: stat.size,
        };
    },

    getThumbnail: async (item: IDatabaseDriveDocument, accountId?: string) => {
        if (item.information.type !== 'FILE') throw new Error('No thumbnail for folder');

        const storagePath = getDriveConfig().storage.path;
        const originalPath = path.join(storagePath, item.information.path);
        const thumbPath = path.join(storagePath, 'cache', 'thumbnails', `${item._id.toString()}.webp`);

        if (!fs.existsSync(originalPath)) throw new Error('Original file not found');

        if (fs.existsSync(thumbPath)) {
            return fs.createReadStream(thumbPath);
        }

        // Generate thumbnail
        if (!fs.existsSync(path.dirname(thumbPath))) fs.mkdirSync(path.dirname(thumbPath), { recursive: true });

        if (item.information.mime.startsWith('image/')) {
            await sharp(originalPath).resize(300, 300, { fit: 'inside' }).toFormat('webp', { quality: 80 }).toFile(thumbPath);
        } else if (item.information.mime.startsWith('video/')) {
            await new Promise((resolve, reject) => {
                ffmpeg(originalPath)
                    .screenshots({
                        count: 1,
                        folder: path.dirname(thumbPath),
                        filename: path.basename(thumbPath),
                        size: '300x?',
                    })
                    .on('end', resolve)
                    .on('error', reject);
            });
        } else {
            throw new Error('Unsupported mime type for thumbnail');
        }

        return fs.createReadStream(thumbPath);
    },

    createFolder: async (name, parentId, owner, accountId) => {
        // Just DB operation for local folders (virtual)
        const getNextOrderValue = async (owner: Record<string, unknown> | null): Promise<number> => {
            const lastItem = await Drive.findOne({ owner }, {}, { sort: { order: -1 } });
            return lastItem ? lastItem.order + 1 : 0;
        };

        const folder = new Drive({
            owner,
            name,
            parentId: parentId === 'root' || !parentId ? null : parentId,
            order: await getNextOrderValue(owner),
            provider: { type: 'LOCAL' },
            information: { type: 'FOLDER' },
            status: 'READY',
        });
        await folder.save();
        return folder.toClient();
    },

    uploadFile: async (drive, filePath, accountId) => {
        if (drive.information.type !== 'FILE') throw new Error('Invalid drive type');

        const storagePath = getDriveConfig().storage.path;
        const destPath = path.join(storagePath, drive.information.path);
        const dirPath = path.dirname(destPath);

        // Ensure source file exists
        if (!fs.existsSync(filePath)) {
            throw new Error('Source file not found');
        }

        // Create destination directory if it doesn't exist
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        // Move file: try rename first (fast), fallback to copy+delete for cross-device
        try {
            fs.renameSync(filePath, destPath);
        } catch (err: unknown) {
            // EXDEV: cross-device link not permitted - use copy+delete instead
            if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'EXDEV') {
                fs.copyFileSync(filePath, destPath);
                fs.unlinkSync(filePath);
            } else {
                throw err;
            }
        }

        // Verify destination file exists after move/copy
        if (!fs.existsSync(destPath)) {
            throw new Error('Failed to write file to destination');
        }

        // Verify file size matches expected
        const destStats = fs.statSync(destPath);
        if (destStats.size !== drive.information.sizeInBytes) {
            // Cleanup corrupted file
            fs.unlinkSync(destPath);
            throw new Error(`Destination file size mismatch: expected ${drive.information.sizeInBytes}, got ${destStats.size}`);
        }

        drive.status = 'READY';
        drive.information.hash = await computeFileHash(destPath);

        if (drive.information.mime.startsWith('image/')) {
            const meta = await extractImageMetadata(destPath);
            if (meta) {
                drive.information.width = meta.width;
                drive.information.height = meta.height;
            }
        }

        await drive.save();
        return drive.toClient();
    },

    delete: async (ids, owner, accountId) => {
        const items = await Drive.find({ _id: { $in: ids }, owner }).lean();

        // Helper to recursively get all children
        const getAllChildren = async (folderIds: string[]): Promise<any[]> => {
            const children = await Drive.find({ parentId: { $in: folderIds }, owner }).lean();
            if (children.length === 0) return [];

            const subFolderIds = children.filter(c => c.information.type === 'FOLDER').map(c => c._id.toString());

            const subChildren = await getAllChildren(subFolderIds);
            return [...children, ...subChildren];
        };

        const folderIds = items.filter(i => i.information.type === 'FOLDER').map(i => i._id.toString());
        const allChildren = await getAllChildren(folderIds);
        const allItemsToDelete = [...items, ...allChildren];

        // Delete files from disk
        for (const item of allItemsToDelete) {
            if (item.information.type === 'FILE' && item.information.path) {
                // Check if any other file points to this path (shouldn't happen in simple model but good hygiene)
                // Actually in this model, path is unique per file
                const fullPath = path.join(getDriveConfig().storage.path, item.information.path);
                const dirPath = path.dirname(fullPath); // .../drive/ID/
                if (fs.existsSync(dirPath)) {
                    fs.rmSync(dirPath, { recursive: true, force: true });
                }
            }
        }

        // Delete from DB
        await Drive.deleteMany({ _id: { $in: allItemsToDelete.map(i => i._id) } });
    },

    trash: async (ids, owner, accountId) => {
        // No-op for local, handled by DB update in index.ts
    },

    syncTrash: async (owner, accountId) => {
        // No-op for local
    },

    untrash: async (ids, owner, accountId) => {
        // No-op for local
    },

    rename: async (id, newName, owner, accountId) => {
        const item = await Drive.findOneAndUpdate({ _id: id, owner }, { name: newName }, { new: true });
        if (!item) throw new Error('Item not found');
        return item.toClient();
    },

    move: async (id, newParentId, owner, accountId) => {
        const item = await Drive.findOne({ _id: id, owner });
        if (!item) throw new Error('Item not found');

        // Update DB
        const oldParentId = item.parentId;
        item.parentId = newParentId === 'root' || !newParentId ? null : new mongoose.Types.ObjectId(newParentId);

        // For LOCAL, we might store files in flat structure or hierarchical?
        // Looking at uploadFile (lines 124): path.join(STORAGE_PATH, drive.information.path)
        // And line 171: path.join(STORAGE_PATH, item.information.path)
        // And line 374 in index.ts: drive.information.path = path.join('drive', String(drive._id), 'data.bin');
        // It seems path is ID-based: drive/<ID>/data.bin.
        // So moving a file DOES NOT change its physical path on disk if path is ID-based and flat?
        // Let's verify 'createFolder'. It just creates DB entry.
        // So hierarchy is virtual in DB. Physical storage is flat-ish (by ID).
        // IF so, 'move' is just DB update!

        // Let's double check implementation of 'uploadFile' in local.ts
        // Line 124: destPath = path.join(STORAGE_PATH, drive.information.path);
        // And 'path' seems to be set in index.ts line 374: `path.join('drive', String(drive._id), 'data.bin')`
        // So yes, physical path is detached from folder structure.

        // So for Local, only DB update is needed.
        await item.save();
        return item.toClient();
    },

    revokeToken: async (owner, accountId) => {
        // No-op
    },
};
