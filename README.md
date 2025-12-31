# @muhgholy/next-drive

Robust file storage and management solution for Next.js and Express applications, featuring a responsive UI, advanced search, trash management, and secure file handling.

## Features

- **File Management**: Upload, rename, move, and organize files and folders.
- **Advanced Search**: Search both active files and the trash bin with real-time filtering.
- **Trash System**: specialized trash view with soft delete, restore, and empty trash capabilities.
- **Responsive UI**: optimized layouts for both desktop (single toolbar) and mobile (search-focused header).
- **Video Support**: Auto-generates thumbnails for video files (requires FFmpeg).
- **Security**: Signed URLs for secure file access and configurable upload limits.
- **View Modes**: Toggle between Grid and List views with custom sorting and grouping.

## Installation

```bash
npm install @muhgholy/next-drive
```

**Peer Dependencies:**

- Next.js >= 14
- React >= 18
- Mongoose >= 7
- Tailwind CSS >= 3

**System Requirements:**

- **FFmpeg**: Required for generating thumbnails from video files.
     - MacOS: `brew install ffmpeg`
     - Ubuntu: `sudo apt install ffmpeg`
     - Windows: Download from official site and add to PATH.

### Tailwind CSS Configuration

Since this package uses Tailwind CSS for styling, you **must** configure Tailwind to scan the package's files:

```js
// tailwind.config.js
export default {
	content: [
		'./app/**/*.{js,ts,jsx,tsx,mdx}',
		'./pages/**/*.{js,ts,jsx,tsx,mdx}',
		'./components/**/*.{js,ts,jsx,tsx,mdx}',
		// Add the next-drive package
		'./node_modules/@muhgholy/next-drive/dist/**/*.{js,mjs}',
	],
	theme: {
		extend: {},
	},
	plugins: [],
};
```

> **Note**: The CSS is automatically injected when you import from `@muhgholy/next-drive/client` - no need to manually import stylesheets.

## Quick Start

### 1. Configure Server

Create a configuration file (e.g., `lib/drive.ts`) to set up storage paths, database connection, and security rules.

```typescript
// lib/drive.ts
import { driveConfiguration } from '@muhgholy/next-drive/server';
import type { TDriveConfigInformation } from '@muhgholy/next-drive/server';

export const drive = driveConfiguration({
	database: 'MONGOOSE',
	storage: { path: '/var/data/drive' },
	security: {
		maxUploadSize: 50 * 1024 * 1024, // 50MB
		allowedMimeTypes: ['image/*', 'video/*', 'application/pdf'],
		signedUrls: {
			enabled: true,
			secret: process.env.DRIVE_SECRET!,
			expiresIn: 3600, // 1 hour
		},
	},
	image: {
		formats: ['webp', 'jpeg', 'png'],
		qualities: ['ultralow', 'low', 'medium', 'high', 'normal'],
	},
	// Optional: Enable CORS for cross-origin requests
	cors: {
		enabled: true,
		origins: ['https://example.com', 'https://app.example.com'],
		credentials: true,
	},
	information: async (req): Promise<TDriveConfigInformation> => {
		// Implement your auth verification here
		const auth = await verifyAuth(req);
		if (!auth) throw new Error('Unauthenticated');
		return {
			key: { userId: auth.userId },
			storage: { quotaInBytes: 1024 * 1024 * 1024 }, // 1GB limit
		};
	},
});
```

### 2. Create API Route

Set up the API route handler that `next-drive` will use to communicate with the client.

**Important:**

- The API route must be in the `pages` folder (Pages Router)
- **You MUST disable Next.js body parser** for uploads to work properly

```typescript
// pages/api/drive.ts
import '@/lib/drive';
import { driveAPIHandler } from '@muhgholy/next-drive/server';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	// Manually parse JSON body for non-upload requests
	if (!req.body) req.body = {};

	if (req.headers['content-type']?.includes('application/json')) {
		try {
			const buffer = await new Promise<Buffer>((resolve, reject) => {
				const chunks: Buffer[] = [];
				req.on('data', chunk => chunks.push(chunk));
				req.on('end', () => resolve(Buffer.concat(chunks)));
				req.on('error', reject);
			});

			if (buffer.length > 0) {
				req.body = JSON.parse(buffer.toString());
			}
		} catch (e) {
			console.error('Failed to parse JSON body', e);
		}
	}

	return driveAPIHandler(req, res);
}

// ⚠️ CRITICAL: Disable body parser for file uploads
export const config = {
	api: {
		bodyParser: false,
	},
};
```

### 2b. Express Integration (Alternative)

If you're using Express instead of Next.js API Routes, use the Express adapter:

```typescript
// lib/drive.ts
import { driveConfigurationExpress } from '@muhgholy/next-drive/server/express';
import type { TDriveConfigInformation } from '@muhgholy/next-drive/server/express';

export const drive = driveConfigurationExpress({
	database: 'MONGOOSE',
	storage: { path: '/var/data/drive' },
	security: {
		maxUploadSizeInBytes: 50 * 1024 * 1024, // 50MB
		allowedMimeTypes: ['image/*', 'video/*', 'application/pdf'],
		signedUrls: {
			enabled: true,
			secret: process.env.DRIVE_SECRET!,
			expiresIn: 3600,
		},
	},
	// Optional: Enable CORS for cross-origin requests
	cors: {
		enabled: true,
		origins: ['https://example.com'],
		credentials: true,
	},
	apiUrl: '/api/drive',
	information: async (req): Promise<TDriveConfigInformation> => {
		// req is Express Request type
		const auth = await verifyAuth(req);
		if (!auth) throw new Error('Unauthenticated');
		return {
			key: { userId: auth.userId },
			storage: { quotaInBytes: 1024 * 1024 * 1024 },
		};
	},
});
```

```typescript
// routes/drive.ts
import './lib/drive'; // Initialize configuration
import express from 'express';
import { driveAPIHandlerExpress } from '@muhgholy/next-drive/server/express';

const router = express.Router();

// Handle all drive API requests
router.all('/drive', driveAPIHandlerExpress);

export default router;
```

**Important for Express:**

- Do NOT use `express.json()` middleware on the drive route (file uploads need raw body)
- The handler supports all HTTP methods (GET, POST, PATCH, DELETE)

### 3. Add Provider

Wrap your application or the specific route with `DriveProvider`.

```typescript
// app/layout.tsx
import { DriveProvider } from "@muhgholy/next-drive/client";

export default function RootLayout({ children }) {
	return <DriveProvider apiEndpoint="/api/drive">{children}</DriveProvider>;
}
```

**Cross-Origin Setup:**

When your client runs on a different domain than the API, enable credentials:

```typescript
// Enable cookies/auth headers for cross-origin requests
<DriveProvider
    apiEndpoint="https://api.example.com/drive"
    withCredentials={true}
>
    {children}
</DriveProvider>
```

> **Note**: Requires matching CORS configuration on the server with `credentials: true`.

### 4. Implement UI Components

You can use the built-in `DriveExplorer` for a full file manager experience or `DriveFileChooser` for form inputs.

**Full File Explorer:**

```typescript
import { DriveExplorer } from "@muhgholy/next-drive/client";

export default function DrivePage() {
	return <DriveExplorer />;
}
```

**File Picker:**

```typescript
import { DriveFileChooser } from "@muhgholy/next-drive/client";
import type { TDriveFile } from "@muhgholy/next-drive/client";

function MyForm() {
	const [file, setFile] = useState<TDriveFile | null>(null);

	return <DriveFileChooser value={file} onChange={setFile} accept="image/*" />;
}
```

**Zod Validation:**

You can use the exported `driveFileSchemaZod` to validate file data in your forms or API routes.

```typescript
import { z } from 'zod';
import { driveFileSchemaZod } from '@muhgholy/next-drive/schemas';

// Use in your form schema (works in both client and server)
const myFormSchema = z.object({
	asset: driveFileSchemaZod,
	title: z.string(),
	description: z.string().optional(),
});

type MyFormData = z.infer<typeof myFormSchema>;
```

> **Note**: The schema is also available from `/client` and `/server` exports for convenience, but `/schemas` is the recommended universal import.

// Use in your form schema
const myFormSchema = z.object({

````

## Key Capabilities

### Client-Side File URLs

**Generate File URL:**

```typescript
import { useDrive } from "@muhgholy/next-drive/client";
import type { TDriveFile } from "@muhgholy/next-drive/client";

function MyComponent() {
	const { createUrl } = useDrive();

	// Basic URL generation
	const url = createUrl(driveFile);
	// Returns: /api/drive?action=serve&id={fileId}

	// With image quality and format
	const url = createUrl(driveFile, {
		quality: "medium",
		format: "webp",
	});
	// Returns: /api/drive?action=serve&id={fileId}&q=medium&format=webp

	// Use in Next.js Image component
	return <Image src={createUrl(driveFile)} alt={driveFile.file.name} />;
}
````

**Responsive Image SrcSet:**

```typescript
import { useDrive } from "@muhgholy/next-drive/client";

function ResponsiveImage({ driveFile }: { driveFile: TDriveFile }) {
	const { createUrl, createSrcSet } = useDrive();

	// Generate responsive srcSet for optimal image loading
	const { srcSet, sizes } = createSrcSet(driveFile, "webp");

	// Use in img tag
	return <img src={createUrl(driveFile, { quality: "medium" })} srcSet={srcSet} sizes={sizes} alt={driveFile.file.name} />;
}
```

### Server-Side File Access

**Get File URL:**

```typescript
import { driveGetUrl } from '@muhgholy/next-drive/server';

// Generate a secure URL
const url = driveGetUrl(fileId);
// Returns: /api/drive?action=serve&id={fileId}&token={signedToken}

// With custom expiry (in seconds)
const url = driveGetUrl(fileId, { expiry: 7200 }); // 2 hours

// With specific expiry date
const url = driveGetUrl(fileId, { expiry: new Date('2025-12-31') });
```

**Read File Stream:**

```typescript
import { driveReadFile } from '@muhgholy/next-drive/server';

// Using file ID
const { stream, mime, size } = await driveReadFile(fileId);
stream.pipe(response);

// Using database document
const drive = await Drive.findById(fileId);
const { stream, mime, size } = await driveReadFile(drive);

// Example: Send file via email
const { stream } = await driveReadFile(fileId);
await sendEmail({
	attachments: [{ filename: 'report.pdf', content: stream }],
});

// Example: Process file contents
const { stream } = await driveReadFile(fileId);
const chunks = [];
for await (const chunk of stream) {
	chunks.push(chunk);
}
const buffer = Buffer.concat(chunks);
```

**Get Local File Path:**

For scenarios requiring direct file system access, `driveFilePath()` provides the absolute path. Google Drive files are automatically downloaded to a local cache.

```typescript
import { driveFilePath } from '@muhgholy/next-drive/server';
import fs from 'fs';

// Get local path (downloads Google Drive files automatically)
const { path, mime, size, provider } = await driveFilePath(fileId);

// Use with synchronous file operations
const buffer = fs.readFileSync(path);

// Use with libraries requiring file paths
await sharp(path).resize(800, 600).toFile('output.jpg');
await ffmpeg(path).format('mp4').save('output.mp4');

// Google Drive files are cached at: storage/library/google/{fileId}.ext
// Local files use their original location
```

### Search & Trash

- **Search Scope**: Search automatically adapts to your current view. If you are browsing the Trash, searches will query deleted items. In the main Browser, searches query active files.
- **Trash Management**: "Delete" moves items to Trash. From Trash, you can "Restore" items or "Delete Forever". A dedicated "Empty Trash" button is available to clear all deleted items.

### CORS Configuration

When your client application runs on a different domain than your API server, you need to enable CORS (Cross-Origin Resource Sharing):

```typescript
// lib/drive.ts
export const drive = driveConfiguration({
	// ... other config
	cors: {
		enabled: true,
		origins: ['https://app.example.com', 'https://admin.example.com'], // or '*' for all origins
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // default
		allowedHeaders: ['Content-Type', 'Authorization', 'X-Drive-Account'], // default
		exposedHeaders: ['Content-Length', 'Content-Type', 'Content-Disposition'], // default
		credentials: true, // Allow cookies/auth headers
		maxAge: 86400, // Preflight cache duration in seconds (default: 24 hours)
	},
});
```

**CORS Options:**

| Option           | Type                 | Default                                                     | Description                                 |
| ---------------- | -------------------- | ----------------------------------------------------------- | ------------------------------------------- |
| `enabled`        | `boolean`            | `false`                                                     | Enable/disable CORS headers                 |
| `origins`        | `string \| string[]` | `'*'`                                                       | Allowed origins (use array for multiple)    |
| `methods`        | `string[]`           | `['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']`               | Allowed HTTP methods                        |
| `allowedHeaders` | `string[]`           | `['Content-Type', 'Authorization', 'X-Drive-Account']`      | Headers clients can send                    |
| `exposedHeaders` | `string[]`           | `['Content-Length', 'Content-Type', 'Content-Disposition']` | Headers exposed to client                   |
| `credentials`    | `boolean`            | `false`                                                     | Allow credentials (cookies, auth headers)   |
| `maxAge`         | `number`             | `86400`                                                     | Preflight response cache duration (seconds) |

> **Note**: When `credentials` is `true`, `origins` cannot be `'*'`. You must specify explicit origins.

### Responsive Design

- **Desktop**: Features a unified single-row header containing Search, Group, Delete, Sort, View, and Trash controls.
- **Mobile**: Optimizes for small screens by separating the Search bar into a full-width top row and grouping action buttons in a scrollable toolbar below.

## API Endpoints

All operations use the `?action=` query parameter on your configured API endpoint:

| Action            | Method | Description                                              |
| ----------------- | ------ | -------------------------------------------------------- |
| `upload`          | POST   | Chunked file upload handling                             |
| `list`            | GET    | List files in a folder (supports `trashed` param)        |
| `serve`           | GET    | Serve file content (supports resizing/format conversion) |
| `thumbnail`       | GET    | specific endpoint for file thumbnails                    |
| `rename`          | PATCH  | Rename a file or folder                                  |
| `trash`           | POST   | Move items to trash (soft delete)                        |
| `deletePermanent` | DELETE | Permanently remove items                                 |
| `restore`         | POST   | Restore items from trash                                 |
| `emptyTrash`      | DELETE | Permanently remove all trashed items                     |
| `createFolder`    | POST   | Create a new directory                                   |
| `move`            | POST   | Move files/folders to a new parent                       |
| `search`          | GET    | Search by name (supports `trashed=true`)                 |
| `quota`           | GET    | Get current storage usage                                |

## License

MIT
