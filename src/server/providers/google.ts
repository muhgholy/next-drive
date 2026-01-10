import fs from 'fs';
import path from 'path';
import { google, type drive_v3 } from 'googleapis';
import { Readable } from 'stream';
import mongoose from 'mongoose';
import Drive from '@/server/database/mongoose/schema/drive';
import StorageAccount from '@/server/database/mongoose/schema/storage/account';
import { getDriveConfig } from '@/server/config';
import type { TStorageProvider, TDriveQuota } from '@/types/server/storage';
import type { IDatabaseDriveDocument } from '@/server/database/mongoose/schema/drive';
import type { TDatabaseDrive } from '@/types/lib/database/drive';

const createAuthClient = async (owner: Record<string, unknown> | null, accountId?: string) => {
    // ** Get credentials from StorageAccount
    const query: Record<string, unknown> = { owner, 'metadata.provider': 'GOOGLE' };
    if (accountId) query._id = accountId;

    // ** If multiple accounts and no accountId, pick first one
    const account = await StorageAccount.findOne(query);
    if (!account) throw new Error('Google Drive account not connected');

    const config = getDriveConfig();
    const { clientId, clientSecret, redirectUri } = config.storage?.google || {};

    if (!clientId || !clientSecret) throw new Error('Google credentials not configured on server');

    const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    // ** Verify it's a google account and metadata exists
    if (account.metadata.provider !== 'GOOGLE' || !account.metadata.google) {
        throw new Error('Invalid Google Account Metadata');
    }

    oAuth2Client.setCredentials(account.metadata.google.credentials as Parameters<typeof oAuth2Client.setCredentials>[0]);

    // ** Update tokens listener
    oAuth2Client.on('tokens', async tokens => {
        if (tokens.refresh_token) {
            account.metadata.google.credentials = { ...account.metadata.google.credentials, ...tokens };
            account.markModified('metadata');
            await account.save();
        }
    });

    return { client: oAuth2Client, accountId: account._id };
};

export const GoogleDriveProvider: TStorageProvider = {
    name: 'GOOGLE',

    sync: async (folderId, owner, accountId) => {
        const { client, accountId: foundAccountId } = await createAuthClient(owner, accountId);
        const drive = google.drive({ version: 'v3', auth: client });

        // Resolve Google Folder ID
        let googleParentId = 'root';
        if (folderId && folderId !== 'root') {
            const folder = await Drive.findOne({ _id: folderId, owner });
            if (folder && folder.provider?.google?.id) {
                googleParentId = folder.provider.google.id;
            } else {
                return;
            }
        }

        // ** List files from Google with pagination
        let pageToken: string | undefined = undefined;
        const allSyncedGoogleIds = new Set<string>();

        do {
            const listParams: drive_v3.Params$Resource$Files$List = {
                q: `'${googleParentId}' in parents and trashed = false`,
                fields: 'nextPageToken, files(id, name, mimeType, size, webViewLink, iconLink, thumbnailLink, createdTime)',
                pageSize: 1000,
                pageToken,
            };
            const res = await drive.files.list(listParams);
            const responseData = res.data;

            pageToken = responseData.nextPageToken ?? undefined;
            const files = responseData.files ?? [];

            // Upsert to MongoDB
            for (const file of files) {
                if (!file.id || !file.name || !file.mimeType) continue;

                // Track ID
                allSyncedGoogleIds.add(file.id);

                // RELAXED FILTER: Allow Google Docs (application/vnd.google-apps.*)
                const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                // if (!isFolder && file.mimeType.startsWith('application/vnd.google-apps.')) continue; // REMOVED FILTER

                const sizeInBytes = file.size ? parseInt(file.size) : 0;

                // Construct update data
                const updateData = {
                    name: file.name,
                    storageAccountId: foundAccountId,
                    parentId: folderId === 'root' ? null : folderId,
                    information: {
                        type: isFolder ? 'FOLDER' : 'FILE',
                        sizeInBytes,
                        mime: file.mimeType,
                        path: '',
                    },
                    provider: {
                        type: 'GOOGLE',
                        google: {
                            id: file.id,
                            webViewLink: file.webViewLink,
                            iconLink: file.iconLink,
                            thumbnailLink: file.thumbnailLink,
                        },
                    },
                    status: 'READY',
                    trashedAt: null,
                };

                // Use source file's createdTime for createdAt on insert
                const insertData = file.createdTime ? { createdAt: new Date(file.createdTime) } : {};

                await Drive.findOneAndUpdate(
                    {
                        owner,
                        'provider.google.id': file.id,
                        'provider.type': 'GOOGLE',
                    },
                    { $set: updateData, $setOnInsert: insertData },
                    { upsert: true, new: true, setDefaultsOnInsert: true },
                );
            }
        } while (pageToken);

        // ** Handle deletions - remove items in DB that were NOT in the gathered list
        const dbItems = await Drive.find({
            owner,
            storageAccountId: foundAccountId,
            parentId: folderId === 'root' ? null : folderId,
            'provider.type': 'GOOGLE',
        });

        for (const item of dbItems) {
            // If item has a google ID and it wasn't seen in the sync list -> trash it
            if (item.provider?.google?.id && !allSyncedGoogleIds.has(item.provider.google.id)) {
                item.trashedAt = new Date();
                await item.save();
            }
        }
    },

    syncTrash: async (owner, accountId) => {
        const { client, accountId: foundAccountId } = await createAuthClient(owner, accountId);
        const driveApi = google.drive({ version: 'v3', auth: client });

        // ** Helper to fetch trashed files with pagination
        const fetchTrashedFiles = async (pageToken?: string) => {
            return driveApi.files.list({
                q: 'trashed = true',
                fields: 'nextPageToken, files(id, name, mimeType, size, webViewLink, iconLink, thumbnailLink, createdTime)',
                pageSize: 100,
                pageToken,
            });
        };

        // ** List trashed files from Google with pagination
        let nextToken: string | undefined = undefined;

        do {
            const listResult = await fetchTrashedFiles(nextToken);
            const files = listResult.data.files || [];

            for (const file of files) {
                if (!file.id || !file.name || !file.mimeType) continue;

                // ** RELAXED FILTER: Allow Google Docs (application/vnd.google-apps.*)
                const isFolder = file.mimeType === 'application/vnd.google-apps.folder';

                const sizeInBytes = file.size ? parseInt(file.size) : 0;

                // ** Use source file's createdTime for createdAt on insert
                const insertData = file.createdTime ? { createdAt: new Date(file.createdTime) } : {};

                await Drive.findOneAndUpdate(
                    { owner, 'provider.google.id': file.id, 'provider.type': 'GOOGLE' },
                    {
                        $set: {
                            name: file.name,
                            storageAccountId: foundAccountId,
                            information: {
                                type: isFolder ? 'FOLDER' : 'FILE',
                                sizeInBytes,
                                mime: file.mimeType,
                                path: '',
                            },
                            provider: {
                                type: 'GOOGLE',
                                google: {
                                    id: file.id,
                                    webViewLink: file.webViewLink,
                                    iconLink: file.iconLink,
                                    thumbnailLink: file.thumbnailLink,
                                },
                            },
                            trashedAt: new Date(),
                        },
                        $setOnInsert: insertData,
                    },
                    { upsert: true, setDefaultsOnInsert: true },
                );
            }

            // ** Update pagination state
            nextToken = listResult.data.nextPageToken ?? undefined;
        } while (nextToken);
    },

    search: async (query, owner, accountId) => {
        const { client, accountId: foundAccountId } = await createAuthClient(owner, accountId);
        const drive = google.drive({ version: 'v3', auth: client });

        // Google Search Query
        // name contains 'query'
        const res = await drive.files.list({
            q: `name contains '${query}' and trashed = false`,
            fields: 'files(id, name, mimeType, size, parents, webViewLink, iconLink, thumbnailLink, createdTime)',
            pageSize: 50,
        });

        const files = res.data.files || [];

        // Upsert results
        // Note: We might not know the local parentId for these items if we haven't synced their parents.
        // This makes it tricky. If we just upsert with parentId=null (root), they show up in root, which is confusing.
        // Option: Don't change parentId if exists. If new, maybe leave parentId null/undefined but we need it.
        // Strategy: Just update existing items metadata?
        // OR: "Search" just returns items without persisting parent structure?
        // But our UI relies on DB.
        // If we upsert new items from search, we must assign a parent.
        // Typically we can't assign accurate local parent ID without traversing up.
        // Compromise: Update properties of existing items. Ignore new items?
        // OR: Just let `list` handle creation. Search only works on things we've synced?
        // NO, user wants to find remote files.
        // Allow creating with parentId = null (root) for now? Or keep them "orphaned" (parentId: undefined) if that works?
        // Drive schema requires parentId? default null.
        // Let's skip upserting NEW items from search for now to avoid mess.
        // Only update existing.
        // Wait, if I search for "Report", I want to see "Report.pdf" even if I never opened the folder.
        // This implies I need to sync it.
        // For now, I will NOT upsert in search to keep safety. search only funds synced items.
        // Re-evaluating: The prompt said "Search... mapping user queries to Google's q syntax".
        // This implies meaningful results.
        // Let's implement basics: Sync results to DB. Parent = null (Root) if unknown.
        // Users can then "Go to location" -> might fail if path unknown.
        // Just upserting with `parentId: null` puts them in root.
        // I will omit parentId in update, so it keeps existing. If new, it defaults to null (Root).
        // This is acceptable behavior for "All files" view or similar.

        for (const file of files) {
            if (!file.id || !file.name) continue;
            const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
            if (!isFolder && file.mimeType?.startsWith('application/vnd.google-apps.')) continue;

            const sizeInBytes = file.size ? parseInt(file.size) : 0;

            // Use source file's createdTime for createdAt on insert
            const insertData = file.createdTime ? { createdAt: new Date(file.createdTime) } : {};

            await Drive.findOneAndUpdate(
                { owner, 'provider.google.id': file.id, 'metadata.type': 'GOOGLE' },
                {
                    $set: {
                        name: file.name,
                        storageAccountId: foundAccountId,
                        information: {
                            type: isFolder ? 'FOLDER' : 'FILE',
                            sizeInBytes,
                            mime: file.mimeType,
                            path: '',
                        },
                        metadata: {
                            type: 'GOOGLE',
                        },
                        provider: {
                            google: {
                                id: file.id,
                                webViewLink: file.webViewLink,
                                iconLink: file.iconLink,
                                thumbnailLink: file.thumbnailLink,
                            },
                        },
                        // Don't overwrite parentId if it exists.
                        // New items will default to null (Root) via schema default
                    },
                    $setOnInsert: insertData,
                },
                { upsert: true, setDefaultsOnInsert: true },
            );
        }
    },

    getQuota: async (owner, accountId, _configuredQuotaInBytes) => {
        const config = getDriveConfig();
        const isRootMode = config.mode === 'ROOT';

        // In ROOT mode, calculate from DB and return unlimited quota
        if (isRootMode) {
            const result = await Drive.aggregate([
                {
                    $match: {
                        'information.type': 'FILE',
                        trashedAt: null,
                        'provider.type': 'GOOGLE',
                        storageAccountId: accountId || null,
                    },
                },
                { $group: { _id: null, total: { $sum: '$information.sizeInBytes' } } },
            ]);
            const usedInBytes = result[0]?.total || 0;
            return { usedInBytes, quotaInBytes: Number.MAX_SAFE_INTEGER };
        }

        // Google Drive uses its own quota from the API, ignores configured quota
        try {
            const { client } = await createAuthClient(owner, accountId);
            const drive = google.drive({ version: 'v3', auth: client });
            const res = await drive.about.get({ fields: 'storageQuota' });
            return {
                usedInBytes: parseInt(res.data.storageQuota?.usage || '0'),
                quotaInBytes: parseInt(res.data.storageQuota?.limit || '0'),
            };
        } catch {
            return { usedInBytes: 0, quotaInBytes: 0 };
        }
    },

    openStream: async (item: IDatabaseDriveDocument, accountId?: string) => {
        const { client } = await createAuthClient(item.owner, accountId || item.storageAccountId?.toString());
        const drive = google.drive({ version: 'v3', auth: client });

        if (!item.provider?.google?.id) throw new Error('Missing Google File ID');

        // ** Check if we can stream functionality
        if (item.information.type === 'FOLDER') throw new Error('Cannot stream folder');

        const res = await drive.files.get(
            { fileId: item.provider.google.id, alt: 'media' },
            { responseType: 'stream' }
        );

        return {
            stream: res.data as Readable,
            mime: item.information.mime,
            size: item.information.sizeInBytes,
        };
    },

    getThumbnail: async (item: IDatabaseDriveDocument, accountId?: string) => {
        const config = getDriveConfig();
        const storagePath = config.storage.path;
        const thumbDir = path.join(storagePath, 'file', item._id.toString(), 'cache');
        const thumbPath = path.join(thumbDir, 'thumbnail.webp');

        // ** Return cached thumbnail if exists
        if (fs.existsSync(thumbPath)) {
            return fs.createReadStream(thumbPath);
        }

        // ** Fetch from Google
        const { client } = await createAuthClient(item.owner, accountId || item.storageAccountId?.toString());
        if (!item.provider?.google?.thumbnailLink) throw new Error('No thumbnail available');

        const res = await client.request<Readable>({ url: item.provider.google.thumbnailLink, responseType: 'stream' });

        // ** Cache the thumbnail
        if (!fs.existsSync(thumbDir)) {
            fs.mkdirSync(thumbDir, { recursive: true });
        }

        const tempPath = `${thumbPath}.tmp`;
        const writeStream = fs.createWriteStream(tempPath);

        await new Promise<void>((resolve, reject) => {
            (res.data as Readable).pipe(writeStream);
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });

        // ** Rename temp to final
        try {
            fs.renameSync(tempPath, thumbPath);
        } catch {
            // If rename fails, cleanup and return stream from Google
            fs.unlinkSync(tempPath);
        }

        // ** Return the cached file
        if (fs.existsSync(thumbPath)) {
            return fs.createReadStream(thumbPath);
        }

        // ** Fallback: refetch from Google
        const refetch = await client.request<Readable>({ url: item.provider.google.thumbnailLink, responseType: 'stream' });
        return refetch.data as Readable;
    },

    createFolder: async (name, parentId, owner, accountId) => {
        const { client, accountId: foundAccountId } = await createAuthClient(owner, accountId);
        const drive = google.drive({ version: 'v3', auth: client });

        let googleParentId = 'root';
        if (parentId && parentId !== 'root') {
            const parent = await Drive.findOne({ _id: parentId, owner });
            if (parent?.provider?.google?.id) googleParentId = parent.provider.google.id;
        }

        const res = await drive.files.create({
            requestBody: {
                name,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [googleParentId],
            },
            fields: 'id, name, mimeType, webViewLink, iconLink',
        });

        const file = res.data;
        if (!file.id) throw new Error('Failed to create folder on Google Drive');

        // Create local record
        const folder = new Drive({
            owner,
            name: file.name,
            parentId: parentId === 'root' || !parentId ? null : parentId,
            provider: {
                type: 'GOOGLE',
                google: {
                    id: file.id,
                    webViewLink: file.webViewLink,
                    iconLink: file.iconLink,
                },
            },
            storageAccountId: foundAccountId,
            information: { type: 'FOLDER' },
            status: 'READY',
        });
        await folder.save();
        return folder.toClient();
    },

    uploadFile: async (drive, filePath, accountId) => {
        if (drive.information.type !== 'FILE') throw new Error('Invalid drive type');

        const { client } = await createAuthClient(drive.owner, accountId || drive.storageAccountId?.toString());
        const googleDrive = google.drive({ version: 'v3', auth: client });

        let googleParentId = 'root';
        if (drive.parentId) {
            const parent = await Drive.findById(drive.parentId);
            if (parent?.provider?.google?.id) googleParentId = parent.provider.google.id;
        }

        try {
            const res = await googleDrive.files.create({
                requestBody: {
                    name: drive.name,
                    parents: [googleParentId],
                    mimeType: drive.information.mime,
                },
                media: {
                    mimeType: drive.information.mime,
                    body: fs.createReadStream(filePath),
                },
                fields: 'id, name, mimeType, webViewLink, iconLink, thumbnailLink, size',
            });

            const gFile = res.data;
            if (!gFile.id) throw new Error('Upload to Google Drive failed');

            // ** Update Drive record
            drive.status = 'READY';
            drive.provider = {
                type: 'GOOGLE',
                google: {
                    id: gFile.id,
                    webViewLink: gFile.webViewLink || undefined,
                    iconLink: gFile.iconLink || undefined,
                    thumbnailLink: gFile.thumbnailLink || undefined,
                },
            };

            // ** Note: We don't delete the temp file here, index.ts handles cleanup
        } catch (error) {
            drive.status = 'FAILED';
            console.error('[next-drive] Google Upload Error:', error);
            throw error;
        }

        await drive.save();
        return drive.toClient();
    },

    delete: async (ids, owner, accountId) => {
        const { client } = await createAuthClient(owner, accountId);
        const drive = google.drive({ version: 'v3', auth: client });

        const items = await Drive.find({ _id: { $in: ids }, owner });

        for (const item of items) {
            if (item.provider?.google?.id) {
                try {
                    await drive.files.delete({ fileId: item.provider.google.id });
                } catch (e) {
                    console.error('Failed to delete Google file', e);
                }
            }
        }

        await Drive.deleteMany({ _id: { $in: ids } });
    },

    trash: async (ids, owner, accountId) => {
        const { client } = await createAuthClient(owner, accountId);
        const drive = google.drive({ version: 'v3', auth: client });

        const items = await Drive.find({ _id: { $in: ids }, owner });

        for (const item of items) {
            if (item.provider?.google?.id) {
                try {
                    await drive.files.update({
                        fileId: item.provider.google.id,
                        requestBody: { trashed: true },
                    });
                } catch (e) {
                    console.error('Failed to trash Google file', e);
                }
            }
        }
    },

    untrash: async (ids, owner, accountId) => {
        const { client } = await createAuthClient(owner, accountId);
        const drive = google.drive({ version: 'v3', auth: client });

        const items = await Drive.find({ _id: { $in: ids }, owner });

        for (const item of items) {
            if (item.provider?.google?.id) {
                try {
                    await drive.files.update({
                        fileId: item.provider.google.id,
                        requestBody: { trashed: false },
                    });
                } catch (e) {
                    console.error('Failed to restore Google file', e);
                }
            }
        }
    },

    rename: async (id, newName, owner, accountId) => {
        const { client } = await createAuthClient(owner, accountId);
        const drive = google.drive({ version: 'v3', auth: client });

        const item = await Drive.findOne({ _id: id, owner });
        if (!item || !item.provider?.google?.id) throw new Error('Item not found');

        await drive.files.update({
            fileId: item.provider.google.id,
            requestBody: { name: newName },
        });

        item.name = newName;
        await item.save();
        return item.toClient();
    },

    move: async (id, newParentId, owner, accountId) => {
        const { client, accountId: foundAccountId } = await createAuthClient(owner, accountId);
        const drive = google.drive({ version: 'v3', auth: client });

        // Get Item
        const item = await Drive.findOne({ _id: id, owner });
        if (!item || !item.provider?.google?.id) throw new Error('Item not found or not synced');

        // Resolve Old Parent Google ID
        let previousGoogleParentId: string | undefined = undefined;
        if (item.parentId) {
            const oldParent = await Drive.findOne({ _id: item.parentId, owner });
            if (oldParent && oldParent.provider?.google?.id) {
                previousGoogleParentId = oldParent.provider.google.id;
            }
        } else {
            // If parentId is null (root), finding previous parent is tricky without querying Google
            // But usually we don't need to specify removeParents if we don't care about multi-parenting?
            // Actually, in Drive API v3, moving requires removeParents if you want to 'move' and not 'add to'.
            // Let's query parents from Google to be safe
            try {
                const gFile = await drive.files.get({ fileId: item.provider.google.id, fields: 'parents' });
                if (gFile.data.parents && gFile.data.parents.length > 0) {
                    previousGoogleParentId = gFile.data.parents.join(',');
                }
            } catch (e) {
                console.warn('Could not fetch parents for move', e);
            }
        }

        // Resolve New Parent Google ID
        let newGoogleParentId = 'root'; // User's root (maybe specific root folder if we support that?)
        // For now, assume 'root' maps to Drive root (or myDrive)
        if (newParentId && newParentId !== 'root') {
            const newParent = await Drive.findOne({ _id: newParentId, owner });
            if (!newParent || !newParent.provider?.google?.id) throw new Error('Target folder not found in Google Drive');
            newGoogleParentId = newParent.provider.google.id;
        }

        // Call Google API
        await drive.files.update({
            fileId: item.provider.google.id,
            addParents: newGoogleParentId,
            removeParents: previousGoogleParentId,
            fields: 'id, parents',
        });

        // Update DB
        item.parentId = newParentId === 'root' || !newParentId ? null : new mongoose.Types.ObjectId(newParentId);
        await item.save();

        return item.toClient();
    },

    revokeToken: async (owner, accountId) => {
        if (!accountId) return; // ** Need specific account to revoke
        const { client } = await createAuthClient(owner, accountId);
        const account = await StorageAccount.findById(accountId);
        if (account?.metadata?.provider === 'GOOGLE' && account.metadata.google?.credentials) {
            const creds = account.metadata.google.credentials as Record<string, unknown>;
            if (typeof creds === 'object' && 'access_token' in creds && typeof creds.access_token === 'string') {
                await client.revokeToken(creds.access_token);
            }
        }
    },
};
