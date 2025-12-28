
import { vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

export const createMocks = (method: string, query: Record<string, string> = {}, body: any = {}) => {
    const req = {
        method,
        query,
        body,
    } as unknown as NextApiRequest;

    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        setHeader: vi.fn(),
        end: vi.fn(),
    } as unknown as NextApiResponse;

    return { req, res };
};

export const mockConfigContent = {
    getDriveConfig: vi.fn().mockReturnValue({
        storage: { path: '/tmp/drive' },
        security: {
            allowedMimeTypes: ['*/*'],
            maxUploadSize: 1024 * 1024 * 100,
            signedUrls: { enabled: false }
        },
    }),
    getDriveInformation: vi.fn().mockResolvedValue({
        key: { id: 'user1' },
        storage: { quotaInBytes: 1024 * 1024 * 1024 },
    }),
};
