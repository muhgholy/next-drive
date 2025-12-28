import { NextApiRequest, NextApiResponse } from 'next';
import { driveAPIHandler } from '@muhgholy/next-drive/server';
import '@/lib/drive'; // Initialize configuration

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Manually parse JSON body because bodyParser is disabled (for uploads)
    if (!req.body) req.body = {}; // Ensure defined

    if (req.headers['content-type']?.includes('application/json')) {
        try {
            const buffer = await new Promise<Buffer>((resolve, reject) => {
                const chunks: Buffer[] = [];
                req.on('data', (chunk) => chunks.push(chunk));
                req.on('end', () => resolve(Buffer.concat(chunks)));
                req.on('error', reject);
            });

            if (buffer.length > 0) {
                req.body = JSON.parse(buffer.toString());
            }
        } catch (e) {
            console.error('Failed to parse JSON body', e);
            // req.body remains {} so handler doesn't crash on property access
        }
    }

    await driveAPIHandler(req, res);
}

// Disable body parser for uploads (formidable handles it)
export const config = {
    api: {
        bodyParser: false,
    },
};
