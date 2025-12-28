import { driveConfiguration } from '@muhgholy/next-drive/server';

// ** Initialize Drive Configuration
// This executed when imported, ensuring getDriveConfig() has data
driveConfiguration({
    database: "MONGOOSE",
    storage: {
        path: './tmp/drive-uploads',
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
            redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/drive?action=callback'
        }
    },
    apiUrl: '/api/drive',
    security: {
        maxUploadSizeInBytes: 100 * 1024 * 1024, // 100MB
        allowedMimeTypes: ['image/*', 'application/pdf', 'video/mp4'],
        trash: { retentionDays: 30 }
    },

    // ** Custom Information Callback
    information: async (req) => {
        return {
            key: { userId: 'user-123' },
            storage: { quotaInBytes: 1024 * 1024 * 1024 }, // 1GB
        };
    },
});
