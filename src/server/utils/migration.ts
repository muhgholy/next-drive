// ** Storage Migration Utility
// ** Handles one-time migrations for storage structure changes
import fs from 'fs';
import path from 'path';
import Drive from '@/server/database/mongoose/schema/drive';
import type { TMigration } from '@/types/server/migration';

// ** Migration version tracking
const MIGRATION_FILE = '.migration-version';
const CURRENT_VERSION = 1;

// ** Migration definitions (add new migrations here)
const migrations: TMigration[] = [
    {
        version: 1,
        name: 'restructure-file-paths',
        migrate: async (storagePath: string) => {
            // ** Migrate from old structure to new structure
            // ** Old: {storagePath}/{fileId}/data.{ext} or {storagePath}/drive/{fileId}/data.bin
            // ** New: {storagePath}/file/{fileId}/data.bin

            const fileDir = path.join(storagePath, 'file');
            if (!fs.existsSync(fileDir)) {
                fs.mkdirSync(fileDir, { recursive: true });
            }

            // ** Find all LOCAL files in database
            const files = await Drive.find({
                'provider.type': 'LOCAL',
                'information.type': 'FILE',
                'information.path': { $exists: true, $ne: '' },
            }).lean();

            for (const file of files) {
                const info = file.information as { type: string; path?: string };
                const oldPath = info.path;
                if (!oldPath) continue;

                // ** Skip if already migrated (starts with 'file/')
                if (oldPath.startsWith('file/')) continue;

                const fileId = String(file._id);
                const newRelativePath = path.join('file', fileId, 'data.bin');
                const oldFullPath = path.join(storagePath, oldPath);
                const newFullPath = path.join(storagePath, newRelativePath);

                // ** Check if old file exists
                if (fs.existsSync(oldFullPath)) {
                    const newDir = path.dirname(newFullPath);
                    if (!fs.existsSync(newDir)) {
                        fs.mkdirSync(newDir, { recursive: true });
                    }

                    // ** Move file to new location
                    try {
                        fs.renameSync(oldFullPath, newFullPath);
                    } catch (err: unknown) {
                        if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'EXDEV') {
                            fs.copyFileSync(oldFullPath, newFullPath);
                            fs.unlinkSync(oldFullPath);
                        } else {
                            console.error(`[next-drive] Migration failed for file ${fileId}:`, err);
                            continue;
                        }
                    }

                    // ** Cleanup old directory if empty
                    const oldDir = path.dirname(oldFullPath);
                    try {
                        const remaining = fs.readdirSync(oldDir);
                        if (remaining.length === 0) {
                            fs.rmdirSync(oldDir);
                        }
                    } catch { /* ignore cleanup errors */ }
                }

                // ** Update database path
                await Drive.updateOne(
                    { _id: file._id },
                    { $set: { 'information.path': newRelativePath } }
                );
            }

            // ** Migrate old cache directory
            const oldCacheDir = path.join(storagePath, 'cache', 'thumbnails');
            if (fs.existsSync(oldCacheDir)) {
                const thumbnails = fs.readdirSync(oldCacheDir);
                for (const thumb of thumbnails) {
                    const fileId = thumb.replace('.webp', '');
                    const oldThumbPath = path.join(oldCacheDir, thumb);
                    const newThumbDir = path.join(storagePath, 'file', fileId, 'cache');
                    const newThumbPath = path.join(newThumbDir, 'thumbnail.webp');

                    if (fs.existsSync(oldThumbPath) && !fs.existsSync(newThumbPath)) {
                        if (!fs.existsSync(newThumbDir)) {
                            fs.mkdirSync(newThumbDir, { recursive: true });
                        }
                        try {
                            fs.renameSync(oldThumbPath, newThumbPath);
                        } catch {
                            // Ignore errors, thumbnail can be regenerated
                        }
                    }
                }

                // ** Cleanup old cache directory
                try {
                    fs.rmSync(oldCacheDir, { recursive: true, force: true });
                    const cacheParent = path.join(storagePath, 'cache');
                    const remaining = fs.readdirSync(cacheParent);
                    if (remaining.length === 0) {
                        fs.rmdirSync(cacheParent);
                    }
                } catch { /* ignore cleanup errors */ }
            }

            // ** Migrate old library/google directory
            const oldLibraryDir = path.join(storagePath, 'library', 'google');
            if (fs.existsSync(oldLibraryDir)) {
                const cachedFiles = fs.readdirSync(oldLibraryDir);
                for (const cached of cachedFiles) {
                    // Extract fileId from filename (format: {fileId}.{ext})
                    const fileId = cached.split('.')[0];
                    if (!fileId) continue;

                    const oldCachedPath = path.join(oldLibraryDir, cached);
                    const newCachedDir = path.join(storagePath, 'file', fileId);
                    const newCachedPath = path.join(newCachedDir, 'data.bin');

                    if (fs.existsSync(oldCachedPath) && !fs.existsSync(newCachedPath)) {
                        if (!fs.existsSync(newCachedDir)) {
                            fs.mkdirSync(newCachedDir, { recursive: true });
                        }
                        try {
                            fs.renameSync(oldCachedPath, newCachedPath);
                        } catch {
                            // Ignore errors, can be re-downloaded
                        }
                    }
                }

                // ** Cleanup old library directory
                try {
                    fs.rmSync(path.join(storagePath, 'library'), { recursive: true, force: true });
                } catch { /* ignore cleanup errors */ }
            }

            // ** Cleanup old 'drive' directory if exists
            const oldDriveDir = path.join(storagePath, 'drive');
            if (fs.existsSync(oldDriveDir)) {
                try {
                    fs.rmSync(oldDriveDir, { recursive: true, force: true });
                } catch { /* ignore cleanup errors */ }
            }

            console.log('[next-drive] Migration v1 complete: restructure-file-paths');
        },
    },
];

// ** Run pending migrations
export const runMigrations = async (storagePath: string): Promise<void> => {
    const versionFile = path.join(storagePath, MIGRATION_FILE);
    let currentVersion = 0;

    // ** Read current version
    if (fs.existsSync(versionFile)) {
        try {
            currentVersion = parseInt(fs.readFileSync(versionFile, 'utf-8').trim(), 10) || 0;
        } catch {
            currentVersion = 0;
        }
    }

    // ** Skip if already at current version
    if (currentVersion >= CURRENT_VERSION) return;

    // ** Ensure storage path exists
    if (!fs.existsSync(storagePath)) {
        fs.mkdirSync(storagePath, { recursive: true });
    }

    // ** Run pending migrations
    const pendingMigrations = migrations.filter(m => m.version > currentVersion);
    for (const migration of pendingMigrations.sort((a, b) => a.version - b.version)) {
        console.log(`[next-drive] Running migration v${migration.version}: ${migration.name}`);
        try {
            await migration.migrate(storagePath);
            // ** Update version after each successful migration
            fs.writeFileSync(versionFile, String(migration.version));
        } catch (error) {
            console.error(`[next-drive] Migration v${migration.version} failed:`, error);
            throw error;
        }
    }
}
