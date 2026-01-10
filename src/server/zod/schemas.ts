import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

// ** Custom ObjectId validator
const objectIdSchema = z.string().refine(val => isValidObjectId(val), {
    message: 'Invalid ObjectId format',
});

// ** Sanitize filename - remove path traversal and dangerous characters
const sanitizeFilename = (name: string): string => {
    return (
        name
            .replace(/[<>:"|?*\x00-\x1F]/g, '') // Remove dangerous chars
            .replace(/^\.+/, '') // Remove leading dots
            .replace(/\.+$/, '') // Remove trailing dots
            .replace(/\\/g, '/') // Normalize slashes
            .replace(/\/+/g, '/') // Remove duplicate slashes
            .replace(/\.\.\//g, '') // Remove path traversal
            .replace(/\.\.+/g, '') // Remove remaining ..
            .split('/')
            .pop() ||
        '' // Take only the filename part (remove all paths)
            .trim()
            .slice(0, 255)
    ); // Limit length
};

// ** Sanitize search query for regex
const sanitizeRegexInput = (input: string): string => {
    // Escape regex special characters
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 100);
};

// ** File/Folder name schema
const nameSchema = z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name too long')
    .transform(sanitizeFilename)
    .refine(val => val.length > 0, { message: 'Invalid name after sanitization' });

// ** Upload chunk schema
export const uploadChunkSchema = z
    .object({
        chunkIndex: z.number().int().min(0).max(10000),
        totalChunks: z.number().int().min(1).max(10000),
        driveId: z.string().optional(),
        fileName: nameSchema,
        fileSize: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
        fileType: z.string().min(1).max(255),
        folderId: z.string().optional(),
    })
    .refine(data => data.chunkIndex < data.totalChunks, {
        message: 'Chunk index must be less than total chunks',
    });

// ** List query schema
export const listQuerySchema = z.object({
    folderId: z.union([z.literal('root'), objectIdSchema, z.undefined()]),
    limit: z
        .string()
        .optional()
        .transform(val => {
            const num = parseInt(val || '50', 10);
            return Math.min(Math.max(1, num), 100);
        }),
    afterId: objectIdSchema.optional(),
});

// ** Serve query schema
export const serveQuerySchema = z.object({
    id: objectIdSchema,
    token: z.string().optional(),
});

// ** Thumbnail query schema
export const thumbnailQuerySchema = z.object({
    id: objectIdSchema,
    size: z.enum(['small', 'medium', 'large']).optional().default('medium'),
    token: z.string().optional(),
});

// ** Rename body schema
export const renameBodySchema = z.object({
    id: objectIdSchema,
    newName: nameSchema,
});

// ** Delete query schema
export const deleteQuerySchema = z.object({
    id: objectIdSchema,
});

// ** Delete many body schema
export const deleteManyBodySchema = z.object({
    ids: z.array(objectIdSchema).min(1).max(1000),
});

// ** Create folder body schema
export const createFolderBodySchema = z.object({
    name: nameSchema,
    parentId: z.union([z.literal('root'), objectIdSchema, z.string().length(0), z.undefined()]).optional(),
});

// ** Move body schema
export const moveBodySchema = z.object({
    ids: z.array(objectIdSchema).min(1).max(1000),
    targetFolderId: z.union([z.literal('root'), objectIdSchema, z.undefined()]).optional(),
});

// ** Reorder body schema
export const reorderBodySchema = z.object({
    ids: z.array(objectIdSchema).min(1).max(1000),
});

// ** Search query schema
export const searchQuerySchema = z.object({
    q: z.string().min(1).max(100).transform(sanitizeRegexInput),
    folderId: z.union([z.literal('root'), objectIdSchema, z.undefined()]).optional(),
    limit: z
        .string()
        .optional()
        .transform(val => {
            const num = parseInt(val || '50', 10);
            return Math.min(Math.max(1, num), 100);
        }),
    trashed: z
        .string()
        .optional()
        .transform(val => val === 'true'),
});

// ** Restore query schema
export const restoreQuerySchema = z.object({
    id: objectIdSchema,
});

// ** Cancel query schema (accepts UUID since uploads use crypto.randomUUID())
export const cancelQuerySchema = z.object({
    id: z.string().uuid(),
});

// ** Purge trash query schema
export const purgeTrashQuerySchema = z.object({
    days: z.number().int().min(1).max(365).optional(),
});

// ** Drive File Schema (Public)
export const driveFileSchemaZod = z.object({
    id: z.string(),
    file: z.object({
        name: z.string(),
        mime: z.string(),
        size: z.number(),
    }),
});

// ** Constants
export const MAX_FOLDER_DEPTH = 50;

// ** Export sanitization functions
export { sanitizeFilename, sanitizeRegexInput };
