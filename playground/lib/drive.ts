import { driveConfiguration } from '@muhgholy/next-drive/server';

// ** Initialize Drive Configuration Promise
// This will be awaited when needed
export const driveConfigPromise = driveConfiguration({
    database: 'MONGOOSE',
    storage: {
        path: './tmp/drive-uploads',
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
            redirectUri: process.env.GOOGLE_REDIRECT_URI || '',
        },
    },
    apiUrl: '/api/drive',
    security: {
        maxUploadSizeInBytes: 10000 * 1024 * 1024, // 100MB
        allowedMimeTypes: ['image/*', 'application/pdf', 'video/mp4'],
        trash: { retentionDays: 30 },
    },

    // ** Custom Information Callback
    information: async () => {
        return {
            key: { userId: 'user-123' },
            storage: { quotaInBytes: 102004 * 1024 * 1024 }, // 1GB
        };
    },
});
