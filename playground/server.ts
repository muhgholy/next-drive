import Link from 'next/link'; // Not needed here but for sorting?
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import mongoose from 'mongoose';
import { driveConfiguration, driveAPIHandler } from '../src/server';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

// ** Ensure DB Connection & Start Server
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/next-file-manager-playground';

(async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Playground connected to DB');

        // ** Drive Configuration is handled in lib/drive.ts which is imported by the API route

        const app = next({ dev, hostname, port });
        const handle = app.getRequestHandler();

        await app.prepare();

        createServer(async (req, res) => {
            try {
                const parsedUrl = parse(req.url!, true);
                const { pathname, query } = parsedUrl;
                await handle(req, res, parsedUrl);
            } catch (err) {
                console.error('Error occurred handling', req.url, err);
                res.statusCode = 500;
                res.end('internal server error');
            }
        })
            .once('error', (err) => {
                console.error(err);
                process.exit(1);
            })
            .listen(port, () => {
                console.log(`> Ready on http://${hostname}:${port}`);
            });

    } catch (e) {
        console.error('Failed to start server:', e);
        process.exit(1);
    }
})();
