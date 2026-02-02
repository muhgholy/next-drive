// ** Server Entry Point
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { z } from 'zod';

import { getDriveConfig, getDriveInformation, driveConfiguration } from '@/server/config';
import Drive from '@/server/database/mongoose/schema/drive';
import StorageAccount from '@/server/database/mongoose/schema/storage/account';
import { validateMimeType, getImageSettings } from '@/server/utils';
import sharp from 'sharp';
import * as schemas from '@/server/zod/schemas';
import { getSafeErrorMessage, sanitizeContentDispositionFilename } from '@/server/security/cryptoUtils';
import type { TDatabaseDrive } from '@/types/server';

// ** Providers
import { LocalStorageProvider } from '@/server/providers/local';
import { GoogleDriveProvider } from '@/server/providers/google';
import type { TStorageProvider } from '@/types/server/storage';
import { google } from 'googleapis';

// ** Helper to get Provider
const getProvider = async (req: NextApiRequest, owner: Record<string, unknown> | null): Promise<{ provider: TStorageProvider; accountId?: string }> => {
    // Check header for account ID
    const accountId = req.headers['x-drive-account'] as string;

    if (!accountId || accountId === 'LOCAL') {
        return { provider: LocalStorageProvider };
    }

    // Validate account belongs to owner
    const account = await StorageAccount.findOne({ _id: accountId, owner });
    if (!account) {
        throw new Error('Invalid Storage Account');
    }

    if (account.metadata.provider === 'GOOGLE') return { provider: GoogleDriveProvider, accountId: account._id.toString() };

    // Fallback
    return { provider: LocalStorageProvider };
};

// ** Helper to apply CORS headers
const applyCorsHeaders = (req: NextApiRequest, res: NextApiResponse, config: ReturnType<typeof getDriveConfig>): boolean => {
    const cors = config.cors;
    if (!cors?.enabled) return false;

    const origin = req.headers.origin;
    const allowedOrigins = cors.origins ?? '*';
    const methods = cors.methods ?? ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
    const allowedHeaders = cors.allowedHeaders ?? ['Content-Type', 'Authorization', 'X-Drive-Account'];
    const exposedHeaders = cors.exposedHeaders ?? ['Content-Length', 'Content-Type', 'Content-Disposition'];
    const credentials = cors.credentials ?? false;
    const maxAge = cors.maxAge ?? 86400; // 24 hours default

    // Determine if origin is allowed
    let allowOrigin: string | null = null;
    if (origin) {
        if (allowedOrigins === '*') {
            allowOrigin = origin;
        } else if (Array.isArray(allowedOrigins)) {
            if (allowedOrigins.includes(origin)) {
                allowOrigin = origin;
            }
        } else if (allowedOrigins === origin) {
            allowOrigin = origin;
        }
    } else if (allowedOrigins === '*') {
        // No origin header (same-origin request), allow if wildcard
        allowOrigin = '*';
    }

    // If origin not allowed, don't set CORS headers (request will fail CORS check)
    if (!allowOrigin) {
        if (req.method === 'OPTIONS') {
            res.status(403).end();
            return true;
        }
        return false;
    }

    res.setHeader('Access-Control-Allow-Origin', allowOrigin);
    res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));
    res.setHeader('Access-Control-Expose-Headers', exposedHeaders.join(', '));
    res.setHeader('Access-Control-Max-Age', maxAge.toString());

    if (credentials) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return true;
    }

    return false;
};

// ** Main API handler for all drive operations
export const driveAPIHandler = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
    // ** Auto-detect OAuth callback when code & state are present but no action
    const action = (req.query.action as string) || (req.query.code && req.query.state ? 'callback' : undefined);

    // ** Ensure Config
    let config: ReturnType<typeof getDriveConfig>;
    try {
        config = getDriveConfig();
    } catch (error) {
        console.error('[next-drive] Configuration error:', error);
        res.status(500).json({ status: 500, message: 'Failed to initialize drive configuration' });
        return;
    }

    // ** Apply CORS headers
    const isPreflightHandled = applyCorsHeaders(req, res, config);
    if (isPreflightHandled) return;

    if (!action) {
        res.status(400).json({ status: 400, message: 'Missing action query parameter' });
        return;
    }

    // ** Public Actions (No Auth Required) - Handle serve and thumbnail before authentication
    if (action === 'serve' || action === 'thumbnail') {
        try {
            const { id, token } = req.query;
            if (!id || typeof id !== 'string') {
                return res.status(400).json({ status: 400, message: 'Missing or invalid file ID' });
            }

            const drive = await Drive.findById(id);
            if (!drive) return res.status(404).json({ status: 404, message: 'File not found' });

            // Verify signed URL token if enabled
            if (config.security?.signedUrls?.enabled) {
                if (!token || typeof token !== 'string') {
                    return res.status(401).json({ status: 401, message: 'Missing or invalid token' });
                }

                try {
                    const decoded = Buffer.from(token, 'base64url').toString();
                    const [expiryStr, signature] = decoded.split(':');
                    const expiry = parseInt(expiryStr, 10);

                    if (Date.now() / 1000 > expiry) {
                        return res.status(401).json({ status: 401, message: 'Token expired' });
                    }

                    const { secret } = config.security.signedUrls;
                    const expectedSignature = crypto.createHmac('sha256', secret)
                        .update(`${id}:${expiry}`)
                        .digest('hex');

                    if (signature !== expectedSignature) {
                        return res.status(401).json({ status: 401, message: 'Invalid token' });
                    }
                } catch (err) {
                    return res.status(401).json({ status: 401, message: 'Invalid token format' });
                }
            }

            // Resolve provider
            const itemProvider = drive.provider?.type === 'GOOGLE' ? GoogleDriveProvider : LocalStorageProvider;
            const itemAccountId = drive.storageAccountId ? drive.storageAccountId.toString() : undefined;

            if (action === 'thumbnail') {
                const stream = await itemProvider.getThumbnail(drive, itemAccountId);
                res.setHeader('Content-Type', 'image/webp');
                if (config.cors?.enabled) {
                    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
                }
                stream.pipe(res);
                return;
            }

            if (action === 'serve') {
                const { stream, mime, size: fileSize } = await itemProvider.openStream(drive, itemAccountId);
                const safeFilename = sanitizeContentDispositionFilename(drive.name);

                // ** Image Transformation Parameters
                const format = req.query.format as string;
                const quality = req.query.quality as string;
                const display = req.query.display as string;
                const sizePreset = req.query.size as string;
                const fit = req.query.fit as string;
                const position = req.query.position as string;

                const isImage = mime.startsWith('image/');
                const shouldTransform = isImage && (format || quality || display || sizePreset || fit);


                res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);

                if (config.cors?.enabled) {
                    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
                }

                if (shouldTransform) {
                    try {
                        // Get all dynamic settings based on file size, quality, display, size, fit, and position
                        const settings = getImageSettings(fileSize, quality, display, sizePreset, fit, position);

                        // Determine target format - ensure we handle common aliases
                        let targetFormat = format || mime.split('/')[1];
                        if (targetFormat === 'jpg') targetFormat = 'jpeg';
                        // Handle cases like 'svg+xml' -> just use jpeg/webp for output
                        if (!['jpeg', 'png', 'webp', 'avif'].includes(targetFormat)) {
                            targetFormat = format || 'webp'; // Default to format param or webp
                        }

                        // ** Cache Logic - Include all parameters in cache key
                        const cacheDir = path.join(config.storage.path, 'file', drive._id.toString(), 'cache');
                        const cacheKey = [
                            'opt',
                            `q${settings.quality}`,
                            `e${settings.effort}`,
                            settings.width ? `${settings.width}x${settings.height}` : 'orig',
                            settings.fit || 'none',
                            settings.position || 'c',
                            targetFormat
                        ].join('_');
                        const cachePath = path.join(cacheDir, `${cacheKey}.bin`);

                        // 1. Check Cache
                        if (fs.existsSync(cachePath)) {
                            const cacheStat = fs.statSync(cachePath);
                            res.setHeader('Content-Type', `image/${targetFormat}`);
                            res.setHeader('Content-Length', cacheStat.size);
                            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
                            if (config.cors?.enabled) {
                                res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
                            }
                            // Close original stream as we don't need it
                            if ('destroy' in stream) (stream as any).destroy();

                            fs.createReadStream(cachePath).pipe(res);
                            return;
                        }

                        // 2. Transform & Cache
                        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

                        // Create sharp pipeline with input stream
                        let pipeline = sharp();

                        // Apply resize if dimensions specified
                        if (settings.width && settings.height) {
                            pipeline = pipeline.resize(settings.width, settings.height, {
                                fit: settings.fit || 'inside',
                                position: settings.position || 'center',
                                withoutEnlargement: true,
                                // Use transparent background for 'contain' fit to preserve transparency
                                background: { r: 0, g: 0, b: 0, alpha: 0 }
                            });
                        }

                        // Format & Quality - all settings are dynamic
                        if (targetFormat === 'jpeg') {
                            pipeline = pipeline.jpeg({ quality: settings.quality, mozjpeg: true });
                            res.setHeader('Content-Type', 'image/jpeg');
                        } else if (targetFormat === 'png') {
                            pipeline = pipeline.png({ compressionLevel: settings.pngCompression, adaptiveFiltering: true });
                            res.setHeader('Content-Type', 'image/png');
                        } else if (targetFormat === 'webp') {
                            // WebP effort is 0-6, not 0-9
                            const webpEffort = Math.min(settings.effort, 6);
                            pipeline = pipeline.webp({ quality: settings.quality, effort: webpEffort });
                            res.setHeader('Content-Type', 'image/webp');
                        } else if (targetFormat === 'avif') {
                            // AVIF effort is 0-9
                            pipeline = pipeline.avif({ quality: settings.quality, effort: settings.effort });
                            res.setHeader('Content-Type', 'image/avif');
                        }

                        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

                        // Handle pipeline errors
                        pipeline.on('error', (err) => {
                            console.error('[next-drive] Pipeline error:', err);
                        });

                        // Pipe stream -> pipeline
                        stream.pipe(pipeline);

                        // Fork 1: Cache (Async)
                        pipeline.clone()
                            .toFile(cachePath)
                            .catch(e => console.error('[next-drive] Cache write failed:', e));

                        // Fork 2: Response
                        pipeline.clone().pipe(res);
                        return;
                    } catch (e) {
                        console.error('[next-drive] Image transformation failed:', e);
                        // Fallback to raw serve handled below
                    }
                }

                // Default Raw Serve
                res.setHeader('Content-Type', mime);
                if (fileSize) res.setHeader('Content-Length', fileSize);
                stream.pipe(res);
                return;
            }
        } catch (error) {
            console.error(`[next-drive] Error in ${action}:`, error);
            return res.status(500).json({
                status: 500,
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    try {
        const mode = config.mode || 'NORMAL';
        const information = await getDriveInformation(req);
        const { key: owner } = information;
        const STORAGE_PATH = config.storage.path;

        // ** In ROOT mode, owner can be null and we list all files without filtering
        const isRootMode = mode === 'ROOT';

        // ** Information Action (No Auth Needed)
        if (action === 'information') {
            const { clientId, clientSecret, redirectUri } = config.storage?.google || {};
            const googleConfigured = !!(clientId && clientSecret && redirectUri);

            return res.status(200).json({
                status: 200,
                message: 'Information retrieved',
                data: {
                    providers: {
                        google: googleConfigured,
                    },
                    mode: mode,
                },
            });
        }

        // ** OAuth & Account Actions (No Provider Resolution Needed)
        if (['getAuthUrl', 'callback', 'listAccounts', 'removeAccount'].includes(action)) {
            switch (action) {
                case 'getAuthUrl': {
                    const { provider } = req.query;
                    if (provider === 'GOOGLE') {
                        const { clientId, clientSecret, redirectUri } = config.storage?.google || {};
                        if (!clientId || !clientSecret || !redirectUri) return res.status(500).json({ status: 500, message: 'Google not configured' });

                        // Append action=callback to redirectUri for explicit routing
                        const callbackUri = new URL(redirectUri);
                        callbackUri.searchParams.set('action', 'callback');
                        const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, callbackUri.toString());
                        // Generate state to identify user
                        // For security, should sign state. Simple base64 for now.
                        const state = Buffer.from(JSON.stringify({ owner })).toString('base64');
                        const url = oAuth2Client.generateAuthUrl({
                            access_type: 'offline',
                            scope: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/userinfo.email'],
                            state,
                            prompt: 'consent', // force refresh token
                        });
                        return res.status(200).json({ status: 200, message: 'Auth URL generated', data: { url } });
                    }
                    return res.status(400).json({ status: 400, message: 'Unknown provider' });
                }
                case 'callback': {
                    const { code, state } = req.query;
                    if (!code) return res.status(400).json({ status: 400, message: 'Missing code' });

                    // Verify state if possible, though 'owner' is derived from session/request usually.
                    // Assuming 'owner' from getDriveInformation is the source of truth for current session.

                    const { clientId, clientSecret, redirectUri } = config.storage?.google || {};
                    if (!clientId || !clientSecret || !redirectUri) return res.status(500).json({ status: 500, message: 'Google not configured' });
                    // Must use the same redirect URI that was used in getAuthUrl (with action=callback)
                    const callbackUri = new URL(redirectUri);
                    callbackUri.searchParams.set('action', 'callback');
                    const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, callbackUri.toString());

                    const { tokens } = await oAuth2Client.getToken(code as string);
                    oAuth2Client.setCredentials(tokens);

                    // Get User Info
                    const oauth2 = google.oauth2({ version: 'v2', auth: oAuth2Client });
                    const userInfo = await oauth2.userinfo.get();

                    // ** Save Account
                    const existing = await StorageAccount.findOne({ owner, 'metadata.google.email': userInfo.data.email, 'metadata.provider': 'GOOGLE' });
                    if (existing) {
                        existing.metadata.google.credentials = tokens as Record<string, unknown>;
                        existing.markModified('metadata');
                        await existing.save();
                    } else {
                        const newAccount = new StorageAccount({
                            owner,
                            name: userInfo.data.name || 'Google Drive',
                            metadata: {
                                provider: 'GOOGLE',
                                google: {
                                    email: userInfo.data.email,
                                    credentials: tokens as Record<string, unknown>,
                                },
                            },
                        });
                        await newAccount.save();
                    }

                    // Helper: Return HTML that notifies parent and closes tab/popup
                    // Uses both postMessage (for popups) and localStorage (for new tabs in fullscreen macOS)
                    res.setHeader('Content-Type', 'text/html');
                    return res.send(`<!DOCTYPE html>
<html>
<head><title>Authentication Complete</title></head>
<body>
<p>Authentication successful! This window will close automatically.</p>
<script>
(function() {
	// Method 1: postMessage for popup windows
	if (window.opener) {
		try {
			window.opener.postMessage('oauth-success', '*');
		} catch (e) {}
	}
	// Method 2: localStorage event for new tabs (macOS fullscreen mode)
	try {
		localStorage.setItem('next-drive-oauth-success', Date.now().toString());
		localStorage.removeItem('next-drive-oauth-success');
	} catch (e) {}
	// Close the window/tab
	window.close();
	// Fallback: If window.close() doesn't work (some browsers block it),
	// show a message to manually close
	setTimeout(function() {
		document.body.innerHTML = '<p style="font-family: system-ui; text-align: center; margin-top: 50px;">Authentication successful!<br>You can close this tab now.</p>';
	}, 500);
})();
</script>
</body>
</html>`);
                }
                case 'listAccounts': {
                    const accounts = await StorageAccount.find({ owner });
                    return res.status(200).json({
                        status: 200,
                        data: {
                            accounts: accounts.map(a => ({
                                id: a._id.toString(),
                                name: a.name,
                                email: a.metadata.google?.email || '',
                                provider: a.metadata.provider,
                            })),
                        },
                    });
                }
                case 'removeAccount': {
                    const { id } = req.query;
                    const account = await StorageAccount.findOne({ _id: id, owner });
                    if (!account) return res.status(404).json({ status: 404, message: 'Account not found' });

                    // Revoke Token if Google
                    if (account.metadata.provider === 'GOOGLE') {
                        try {
                            await GoogleDriveProvider.revokeToken(owner, account._id.toString());
                        } catch (e) {
                            console.error('Failed to revoke Google token:', e);
                            // Proceed to delete anyway
                        }
                    }

                    await StorageAccount.deleteOne({ _id: id, owner });
                    await Drive.deleteMany({ owner, storageAccountId: id });
                    return res.status(200).json({ status: 200, message: 'Account removed' });
                }
            }
        }

        // ** Provider Actions
        const { provider, accountId } = await getProvider(req, owner);

        switch (action) {
            // ** 1. LIST **
            case 'list': {
                if (req.method !== 'GET') return res.status(405).json({ status: 405, message: 'Only GET allowed' });
                const listQuery = schemas.listQuerySchema.safeParse(req.query);
                if (!listQuery.success) return res.status(400).json({ status: 400, message: 'Invalid parameters' });

                const { folderId, limit, afterId } = listQuery.data;

                // Sync Trigger: If viewing a folder, try to sync it first if provider supports it
                // Only sync if we are browsing a specific folder or root
                try {
                    await provider.sync(folderId || 'root', owner, accountId);
                } catch (e) {
                    console.error('Sync failed', e);
                    // Continue to list what we have in DB
                }

                // Query DB - In ROOT mode, don't filter by owner
                const query: Record<string, unknown> = {
                    'provider.type': provider.name,
                    storageAccountId: accountId || null,
                    parentId: folderId === 'root' || !folderId ? null : folderId,
                    trashedAt: null,
                };

                // Only filter by owner in NORMAL mode
                if (!isRootMode) {
                    query.owner = owner;
                }

                if (afterId) query._id = { $lt: afterId }; // Pagination

                const items = await Drive.find(query, {}, { sort: { order: 1, _id: -1 }, limit });
                let plainItems = await Promise.all(items.map(item => item.toClient()));

                // Add signed URL tokens if enabled
                if (config.security?.signedUrls?.enabled && config.security.signedUrls.secret) {
                    const { secret, expiresIn } = config.security.signedUrls;
                    plainItems = plainItems.map(item => {
                        const expiryTimestamp = Math.floor(Date.now() / 1000) + expiresIn;
                        const signature = crypto.createHmac('sha256', secret).update(`${item.id}:${expiryTimestamp}`).digest('hex');
                        return { ...item, token: Buffer.from(`${expiryTimestamp}:${signature}`).toString('base64url') };
                    });
                }

                res.status(200).json({ status: 200, message: 'Items retrieved', data: { items: plainItems, hasMore: items.length === limit } });
                return;
            }

            // ** 2. SEARCH **
            case 'search': {
                const searchData = schemas.searchQuerySchema.safeParse(req.query);
                if (!searchData.success) return res.status(400).json({ status: 400, message: 'Invalid params' });
                const { q, folderId, limit, trashed } = searchData.data;

                // Sync Search
                if (!trashed) {
                    try {
                        await provider.search(q, owner, accountId);
                    } catch (e) {
                        console.error('Search sync failed', e);
                    }
                }

                // Query DB - In ROOT mode, don't filter by owner
                const query: Record<string, unknown> = {
                    'provider.type': provider.name,
                    storageAccountId: accountId || null,
                    trashedAt: trashed ? { $ne: null } : null,
                    name: { $regex: q, $options: 'i' },
                };

                // Only filter by owner in NORMAL mode
                if (!isRootMode) {
                    query.owner = owner;
                }

                if (folderId && folderId !== 'root') query.parentId = folderId;

                const items = await Drive.find(query, {}, { limit, sort: { createdAt: -1 } });
                let plainItems = await Promise.all(items.map(i => i.toClient()));

                // Add signed URL tokens if enabled
                if (config.security?.signedUrls?.enabled && config.security.signedUrls.secret) {
                    const { secret, expiresIn } = config.security.signedUrls;
                    plainItems = plainItems.map(item => {
                        const expiryTimestamp = Math.floor(Date.now() / 1000) + expiresIn;
                        const signature = crypto.createHmac('sha256', secret).update(`${item.id}:${expiryTimestamp}`).digest('hex');
                        return { ...item, token: Buffer.from(`${expiryTimestamp}:${signature}`).toString('base64url') };
                    });
                }

                return res.status(200).json({ status: 200, message: 'Results', data: { items: plainItems } });
            }

            // ** 3. UPLOAD **
            case 'upload': {
                if (req.method !== 'POST') return res.status(405).json({ status: 405, message: 'Only POST allowed' });
                const systemTmpDir = path.join(os.tmpdir(), 'next-drive-uploads');
                if (!fs.existsSync(systemTmpDir)) fs.mkdirSync(systemTmpDir, { recursive: true });
                const form = formidable({
                    multiples: false,
                    maxFileSize: (config.security?.maxUploadSizeInBytes ?? 1024 * 1024 * 1024) * 2,
                    uploadDir: systemTmpDir,
                    keepExtensions: true,
                });

                const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
                    form.parse(req, (err, fields, files) => {
                        if (err) reject(err);
                        else resolve([fields, files]);
                    });
                });

                const cleanupTempFiles = (files: formidable.Files) => {
                    Object.values(files)
                        .flat()
                        .forEach(file => {
                            if (file && fs.existsSync(file.filepath)) fs.rmSync(file.filepath, { force: true });
                        });
                };

                const getString = (f: string[] | string | undefined) => (Array.isArray(f) ? f[0] : f || '');
                const getInt = (f: string[] | string | undefined) => parseInt(getString(f) || '0', 10);

                const uploadData = schemas.uploadChunkSchema.safeParse({
                    chunkIndex: getInt(fields.chunkIndex),
                    totalChunks: getInt(fields.totalChunks),
                    driveId: getString(fields.driveId) || undefined,
                    fileName: getString(fields.fileName),
                    fileSize: getInt(fields.fileSize),
                    fileType: getString(fields.fileType),
                    folderId: getString(fields.folderId) || undefined,
                });

                if (!uploadData.success) {
                    cleanupTempFiles(files);
                    return res.status(400).json({ status: 400, message: uploadData.error.errors[0].message });
                }

                const { chunkIndex, totalChunks, driveId, fileName, fileSize: fileSizeInBytes, fileType, folderId } = uploadData.data;

                let currentUploadId = driveId;

                // Ensure temp directory for this upload exists (uses system tmp for auto-cleanup)
                const tempBaseDir = path.join(os.tmpdir(), 'next-drive-uploads');

                if (!currentUploadId) {
                    // Start of new upload (usually Chunk 0, but could be adapted)
                    if (chunkIndex !== 0) return res.status(400).json({ message: 'Missing upload ID for non-zero chunk' });

                    if (fileType && config.security) {
                        if (!validateMimeType(fileType, config.security.allowedMimeTypes)) {
                            cleanupTempFiles(files);
                            return res.status(400).json({ status: 400, message: `File type ${fileType} not allowed` });
                        }
                    }

                    // Quota Check - Skip in ROOT mode
                    if (!isRootMode) {
                        const quota = await provider.getQuota(owner, accountId, information.storage.quotaInBytes);
                        if (quota.usedInBytes + fileSizeInBytes > quota.quotaInBytes) {
                            cleanupTempFiles(files);
                            return res.status(413).json({ status: 413, message: 'Storage quota exceeded' });
                        }
                    }

                    // Generate Temp ID (Stateless)
                    currentUploadId = crypto.randomUUID();
                    const uploadDir = path.join(tempBaseDir, currentUploadId);
                    fs.mkdirSync(uploadDir, { recursive: true });

                    // Save Metadata
                    const metadata = {
                        owner,
                        accountId,
                        providerName: provider.name,
                        name: fileName,
                        parentId: folderId === 'root' || !folderId ? null : folderId,
                        fileSize: fileSizeInBytes,
                        mimeType: fileType,
                        totalChunks,
                    };
                    fs.writeFileSync(path.join(uploadDir, 'metadata.json'), JSON.stringify(metadata));
                }

                // Handle Chunk Save
                if (currentUploadId) {
                    const uploadDir = path.join(tempBaseDir, currentUploadId);

                    if (!fs.existsSync(uploadDir)) {
                        cleanupTempFiles(files);
                        // If dir missing, maybe upload expired or finished?
                        return res.status(404).json({ status: 404, message: 'Upload session not found or expired' });
                    }

                    try {
                        const chunkFile = Array.isArray(files.chunk) ? files.chunk[0] : files.chunk;
                        if (!chunkFile) throw new Error('No chunk file received');

                        // Save part file: part_0, part_1...
                        const partPath = path.join(uploadDir, `part_${chunkIndex}`);

                        // Move chunk to upload dir - handle cross-device case
                        try {
                            fs.renameSync(chunkFile.filepath, partPath);
                        } catch (err: unknown) {
                            if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'EXDEV') {
                                fs.copyFileSync(chunkFile.filepath, partPath);
                                fs.unlinkSync(chunkFile.filepath);
                            } else {
                                throw err;
                            }
                        }

                        // Check Completion
                        // We count files starting with 'part_'
                        const uploadedParts = fs.readdirSync(uploadDir).filter(f => f.startsWith('part_'));

                        // Merge if all parts present
                        if (uploadedParts.length === totalChunks) {
                            // 1. Read Metadata
                            const metaPath = path.join(uploadDir, 'metadata.json');
                            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));

                            // 2. Merge Parts into final file
                            const finalTempPath = path.join(uploadDir, 'final.bin');
                            const writeStream = fs.createWriteStream(finalTempPath);

                            // Track stream errors immediately
                            let streamError: Error | null = null;
                            writeStream.on('error', (err) => {
                                streamError = err;
                            });

                            // Wait for stream to be ready
                            await new Promise<void>((resolve, reject) => {
                                writeStream.on('open', () => resolve());
                                writeStream.once('error', reject);
                            });

                            // Write chunks with proper backpressure handling
                            for (let i = 0; i < totalChunks; i++) {
                                if (streamError) {
                                    writeStream.destroy();
                                    throw streamError;
                                }
                                const pPath = path.join(uploadDir, `part_${i}`);
                                if (!fs.existsSync(pPath)) {
                                    writeStream.destroy();
                                    throw new Error(`Missing chunk part: ${i}`);
                                }
                                const data = fs.readFileSync(pPath);
                                const canContinue = writeStream.write(data);

                                // Handle backpressure - wait for drain if buffer is full
                                if (!canContinue) {
                                    await new Promise<void>((resolve, reject) => {
                                        writeStream.once('drain', resolve);
                                        writeStream.once('error', reject);
                                    });
                                }
                            }

                            // Wait for write stream to finish
                            await new Promise<void>((resolve, reject) => {
                                if (streamError) {
                                    reject(streamError);
                                    return;
                                }
                                writeStream.end();
                                writeStream.on('finish', resolve);
                                writeStream.once('error', reject);
                            });

                            // Verify final file exists
                            if (!fs.existsSync(finalTempPath)) {
                                throw new Error('Failed to create merged file');
                            }

                            // Verify file size matches expected
                            const finalStats = fs.statSync(finalTempPath);
                            if (finalStats.size !== meta.fileSize) {
                                throw new Error(`File size mismatch: expected ${meta.fileSize}, got ${finalStats.size}`);
                            }

                            // 3. Create DB Record (Delayed)
                            const drive = new Drive({
                                owner: meta.owner,
                                storageAccountId: meta.accountId || null,
                                provider: { type: meta.providerName },
                                name: meta.name,
                                parentId: meta.parentId,
                                order: 0,
                                information: { type: 'FILE', sizeInBytes: meta.fileSize, mime: meta.mimeType, path: '' }, // path set by provider
                                status: 'UPLOADING',
                                currentChunk: totalChunks,
                                totalChunks: totalChunks,
                            });

                            // Set initial path based on ID - providers will resolve final path/ID
                            if (meta.providerName === 'LOCAL' && drive.information.type === 'FILE') {
                                // Path is relative to storage.path - use new structure
                                drive.information.path = path.join('file', String(drive._id), 'data.bin');
                            }

                            await drive.save();

                            // 4. Provider Upload
                            try {
                                const item = await provider.uploadFile(drive, finalTempPath, meta.accountId);

                                // Cleanup
                                fs.rmSync(uploadDir, { recursive: true, force: true });

                                const newQuota = await provider.getQuota(meta.owner, meta.accountId, information.storage.quotaInBytes);
                                res.status(200).json({ status: 200, message: 'Upload complete', data: { type: 'UPLOAD_COMPLETE', driveId: String(drive._id), item }, statistic: { storage: newQuota } });
                            } catch (err) {
                                // Upload to provider failed
                                await Drive.deleteOne({ _id: drive._id });
                                throw err;
                            }
                        } else {
                            // Chunk received, wait for others
                            const newQuota = await provider.getQuota(owner, accountId, information.storage.quotaInBytes);
                            // If this was chunk 0, we send UPLOAD_STARTED with the new ID
                            if (chunkIndex === 0) {
                                res.status(200).json({ status: 200, message: 'Upload started', data: { type: 'UPLOAD_STARTED', driveId: currentUploadId }, statistic: { storage: newQuota } });
                            } else {
                                res.status(200).json({ status: 200, message: 'Chunk received', data: { type: 'CHUNK_RECEIVED', driveId: currentUploadId, chunkIndex }, statistic: { storage: newQuota } });
                            }
                        }
                    } catch (e) {
                        cleanupTempFiles(files);
                        // Don't delete entire dir on one chunk fail, might be retryable?
                        // For now, if fatal error, maybe we should?
                        // Let's just throw for now.
                        throw e;
                    }
                    return;
                }

                // Should not happen if logic holds
                cleanupTempFiles(files);
                return res.status(400).json({ status: 400, message: 'Invalid upload request' });
            }

            // ** 4. CANCEL UPLOAD **
            case 'cancel': {
                const cancelData = schemas.cancelQuerySchema.safeParse(req.query);
                if (!cancelData.success) return res.status(400).json({ status: 400, message: 'Invalid ID' });
                const { id } = cancelData.data;

                // Try to clean up temp upload directory (in system tmp)
                const tempUploadDir = path.join(os.tmpdir(), 'next-drive-uploads', id);
                if (fs.existsSync(tempUploadDir)) {
                    try {
                        fs.rmSync(tempUploadDir, { recursive: true, force: true });
                    } catch (e) {
                        console.error('Failed to cleanup temp upload:', e);
                    }
                }

                return res.status(200).json({ status: 200, message: 'Upload cancelled', data: null });
            }

            // ** 5. CREATE FOLDER **
            case 'createFolder': {
                const folderData = schemas.createFolderBodySchema.safeParse(req.body);
                if (!folderData.success) return res.status(400).json({ status: 400, message: folderData.error.errors[0].message });
                const { name, parentId } = folderData.data;

                const item = await provider.createFolder(name, parentId ?? null, owner, accountId);
                return res.status(201).json({ status: 201, message: 'Folder created', data: { item } });
            }

            // ** 5. DELETE **
            case 'delete': {
                const deleteData = schemas.deleteQuerySchema.safeParse(req.query);
                if (!deleteData.success) return res.status(400).json({ status: 400, message: 'Invalid ID' });
                // We use generic delete (trash)
                const { id } = deleteData.data;
                const drive = await Drive.findById(id);
                if (!drive) return res.status(404).json({ status: 404, message: 'Not found' });

                // Call Provider Trash
                const itemProvider = drive.provider?.type === 'GOOGLE' ? GoogleDriveProvider : LocalStorageProvider;
                const itemAccountId = drive.storageAccountId ? drive.storageAccountId.toString() : undefined;

                try {
                    await itemProvider.trash([id], owner, itemAccountId);
                } catch (e) {
                    console.error('Provider trash failed:', e);
                }

                drive.trashedAt = new Date();
                await drive.save();
                return res.status(200).json({ status: 200, message: 'Moved to trash', data: null });
            }

            // ** 6. HARD DELETE **
            case 'deletePermanent': {
                const deleteData = schemas.deleteQuerySchema.safeParse(req.query);
                if (!deleteData.success) return res.status(400).json({ status: 400, message: 'Invalid ID' });
                const { id } = deleteData.data;
                // Provider Delete
                await provider.delete([id], owner, accountId);
                const quota = await provider.getQuota(owner, accountId, information.storage.quotaInBytes);
                return res.status(200).json({ status: 200, message: 'Deleted', statistic: { storage: quota } });
            }

            // ** 7. QUOTA **
            case 'quota': {
                const quota = await provider.getQuota(owner, accountId, information.storage.quotaInBytes);
                return res.status(200).json({
                    status: 200,
                    message: 'Quota retrieved',
                    data: { usedInBytes: quota.usedInBytes, totalInBytes: quota.quotaInBytes, availableInBytes: Math.max(0, quota.quotaInBytes - quota.usedInBytes), percentage: quota.quotaInBytes > 0 ? Math.round((quota.usedInBytes / quota.quotaInBytes) * 100) : 0 },
                    statistic: { storage: quota },
                });
            }

            // ** 7B. TRASH **
            case 'trash': {
                // Try to sync trash first
                try {
                    const { provider: trashProvider, accountId: trashAccountId } = await getProvider(req, owner);
                    await trashProvider.syncTrash(owner, trashAccountId);
                } catch (e) {
                    console.error('Trash sync failed', e);
                }

                // Return items that are in trash
                const query: Record<string, unknown> = {
                    owner,
                    'provider.type': provider.name,
                    storageAccountId: accountId || null,
                    trashedAt: { $ne: null },
                };

                const items = await Drive.find(query, {}, { sort: { trashedAt: -1 } });
                let plainItems = await Promise.all(items.map(item => item.toClient()));

                // Add signed URL tokens if enabled
                if (config.security?.signedUrls?.enabled && config.security.signedUrls.secret) {
                    const { secret, expiresIn } = config.security.signedUrls;
                    plainItems = plainItems.map(item => {
                        const expiryTimestamp = Math.floor(Date.now() / 1000) + expiresIn;
                        const signature = crypto.createHmac('sha256', secret).update(`${item.id}:${expiryTimestamp}`).digest('hex');
                        return { ...item, token: Buffer.from(`${expiryTimestamp}:${signature}`).toString('base64url') };
                    });
                }

                return res.status(200).json({
                    status: 200,
                    message: 'Trash items',
                    data: { items: plainItems, hasMore: false },
                });
            }

            // ** 7C. RESTORE **
            case 'restore': {
                const restoreData = schemas.deleteQuerySchema.safeParse(req.query);
                if (!restoreData.success) return res.status(400).json({ status: 400, message: 'Invalid ID' });
                const { id } = restoreData.data;
                const drive = await Drive.findById(id);
                if (!drive) return res.status(404).json({ status: 404, message: 'Not found' });

                // Check if parent folder is trashed - if so, move to root
                let targetParentId = drive.parentId;
                if (targetParentId) {
                    const parent = await Drive.findById(targetParentId);
                    if (parent?.trashedAt) {
                        targetParentId = null; // Move to root instead
                    }
                }

                // Call Provider Untrash
                const itemProvider = drive.provider?.type === 'GOOGLE' ? GoogleDriveProvider : LocalStorageProvider;
                const itemAccountId = drive.storageAccountId ? drive.storageAccountId.toString() : undefined;

                try {
                    await itemProvider.untrash([id], owner, itemAccountId);
                    // If moving to root due to trashed parent, update location in provider
                    if (targetParentId !== drive.parentId) {
                        await itemProvider.move(id, targetParentId?.toString() ?? null, owner, itemAccountId);
                    }
                } catch (e) {
                    console.error('Provider restore failed:', e);
                }

                // Restore item in database
                drive.trashedAt = null;
                drive.parentId = targetParentId;
                await drive.save();

                return res.status(200).json({
                    status: 200,
                    message: targetParentId === null && drive.parentId !== null ? 'Restored to root (parent folder was trashed)' : 'Restored',
                    data: null,
                });
            }

            // ** 7D. MOVE **
            case 'move': {
                const moveData = schemas.moveBodySchema.safeParse(req.body);
                if (!moveData.success) return res.status(400).json({ status: 400, message: 'Invalid data' });
                const { ids, targetFolderId } = moveData.data;

                const items: TDatabaseDrive[] = [];
                // Target folder ID for provider (null for root)
                const effectiveTargetId = targetFolderId === 'root' || !targetFolderId ? null : targetFolderId;

                for (const id of ids) {
                    try {
                        const item = await provider.move(id, effectiveTargetId, owner, accountId);
                        items.push(item);
                    } catch (e) {
                        console.error(`Failed to move item ${id}`, e);
                        // Continue moving other items
                    }
                }

                return res.status(200).json({ status: 200, message: 'Moved', data: { items } });
            }

            // ** 8. RENAME **
            case 'rename': {
                const renameData = schemas.renameBodySchema.safeParse({ id: req.query.id, ...req.body });
                if (!renameData.success) return res.status(400).json({ status: 400, message: 'Invalid data' });
                const { id, newName } = renameData.data;
                const item = await provider.rename(id, newName, owner, accountId);
                return res.status(200).json({ status: 200, message: 'Renamed', data: { item } });
            }

            // ** 9. THUMBNAIL **
            default:
                res.status(400).json({ status: 400, message: `Unknown action: ${action}` });
        }
    } catch (error: unknown) {
        console.error(`[next-drive] Error handling action ${action}:`, error);
        // FOR DEBUGGING: Return the actual error message
        res.status(500).json({ status: 500, message: error instanceof Error ? error.message : 'Unknown error' });
    }
};

// ** Exports
export { driveConfiguration, getDriveConfig, getDriveInformation };
export { driveGetUrl, driveReadFile, driveFilePath, driveUpload, driveDelete, driveList, driveInfo } from '@/server/controllers/drive';
export { driveFileSchemaZod } from '@/server/zod/schemas';
export { driveCreateUrl } from '@/client/utils';
export type { TDriveFile, TDriveInformation } from '@/types/client';
export type * from '@/types/server';
