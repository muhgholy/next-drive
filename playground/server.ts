import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import mongoose from 'mongoose';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 8789;

// ** Ensure DB Connection & Start Server
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/next-drive-playground';

(async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Playground connected to DB');

        // ** Drive Configuration is handled in lib/drive.ts which is imported by the API route

        const app = next({ dev, hostname, port });
        const handle = app.getRequestHandler();

        await app.prepare();

        const server = createServer(async (req, res) => {
            try {
                const parsedUrl = parse(req.url!, true);
                await handle(req, res, parsedUrl);
            } catch (err) {
                console.error('Error occurred handling', req.url, err);
                res.statusCode = 500;
                res.end('internal server error');
            }
        });

        // Enable HTTP Keep-Alive
        server.keepAliveTimeout = 65000; // 65 seconds (higher than nginx default)
        server.headersTimeout = 66000; // Slightly higher than keepAliveTimeout
        server.maxConnections = 1000; // Limit concurrent connections
        server.maxConnections = 1000; // Limit concurrent connections

        server
            .once('error', (err) => {
                console.error(err);
                process.exit(1);
            })
            .listen(port, () => {
                console.log(`> Ready on http://${hostname}:${port}`);
                console.log(`> Keep-Alive enabled (${server.keepAliveTimeout}ms timeout)`);
            });

    } catch (e) {
        console.error('Failed to start server:', e);
        process.exit(1);
    }
})();
