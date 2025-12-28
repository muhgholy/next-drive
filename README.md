# @muhgholy/next-drive

Robust file storage and management solution for Next.js applications, featuring a responsive UI, advanced search, trash management, and secure file handling.

## Features

-    **File Management**: Upload, rename, move, and organize files and folders.
-    **Advanced Search**: Search both active files and the trash bin with real-time filtering.
-    **Trash System**: specialized trash view with soft delete, restore, and empty trash capabilities.
-    **Responsive UI**: optimized layouts for both desktop (single toolbar) and mobile (search-focused header).
-    **Video Support**: Auto-generates thumbnails for video files (requires FFmpeg).
-    **Security**: Signed URLs for secure file access and configurable upload limits.
-    **View Modes**: Toggle between Grid and List views with custom sorting and grouping.

## Installation

```bash
npm install @muhgholy/next-drive
```

**Peer Dependencies:**

-    Next.js >= 14
-    React >= 18
-    Mongoose >= 7

**System Requirements:**

-    **FFmpeg**: Required for generating thumbnails from video files.
     -    MacOS: `brew install ffmpeg`
     -    Ubuntu: `sudo apt install ffmpeg`
     -    Windows: Download from official site and add to PATH.

## Quick Start

### 1. Configure Server

Create a configuration file (e.g., `lib/drive.ts`) to set up storage paths, database connection, and security rules.

```typescript
// lib/drive.ts
import { driveConfiguration } from "@muhgholy/next-drive/server";
import type { TDriveConfigInformation } from "@muhgholy/next-drive/server";

export const drive = driveConfiguration({
	database: "MONGOOSE",
	storage: { path: "/var/data/drive" },
	security: {
		maxUploadSize: 50 * 1024 * 1024, // 50MB
		allowedMimeTypes: ["image/*", "video/*", "application/pdf"],
		signedUrls: {
			enabled: true,
			secret: process.env.DRIVE_SECRET!,
			expiresIn: 3600, // 1 hour
		},
	},
	image: {
		formats: ["webp", "jpeg", "png"],
		qualities: ["ultralow", "low", "medium", "high", "normal"],
	},
	information: async (req): Promise<TDriveConfigInformation> => {
		// Implement your auth verification here
		const auth = await verifyAuth(req);
		return {
			key: auth ? { userId: auth.userId } : null,
			storage: { quotaInBytes: 1024 * 1024 * 1024 }, // 1GB limit
		};
	},
});
```

### 2. Create API Route

Set up the API route handler that `next-drive` will use to communicate with the client.

```typescript
// pages/api/drive.ts (Pages Router)
// or app/api/drive/route.ts (App Router)

import { drive } from "@/lib/drive";
import { driveAPIHandler } from "@muhgholy/next-drive/server";

export default function handler(req, res) {
	return driveAPIHandler(drive, req, res);
}
```

### 3. Add Provider

Wrap your application or the specific route with `DriveProvider`.

```typescript
// app/layout.tsx
import { DriveProvider } from "@muhgholy/next-drive/client";

export default function RootLayout({ children }) {
	return <DriveProvider apiEndpoint="/api/drive">{children}</DriveProvider>;
}
```

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

## Key Capabilities

### Server-Side File Access

**Get File URL:**

```typescript
import { driveGetUrl } from "@muhgholy/next-drive/server";

// Generate a secure URL
const url = driveGetUrl(fileId);
// Returns: /api/drive?action=serve&id={fileId}&token={signedToken}

// With custom expiry (in seconds)
const url = driveGetUrl(fileId, { expiry: 7200 }); // 2 hours

// With specific expiry date
const url = driveGetUrl(fileId, { expiry: new Date("2025-12-31") });
```

**Read File Stream:**

```typescript
import { driveReadFile } from "@muhgholy/next-drive/server";

// Using file ID
const { stream, mime, size } = await driveReadFile(fileId);
stream.pipe(response);

// Using database document
const drive = await Drive.findById(fileId);
const { stream, mime, size } = await driveReadFile(drive);

// Example: Send file via email
const { stream } = await driveReadFile(fileId);
await sendEmail({
	attachments: [{ filename: "report.pdf", content: stream }],
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
import { driveFilePath } from "@muhgholy/next-drive/server";
import fs from "fs";

// Get local path (downloads Google Drive files automatically)
const { path, mime, size, provider } = await driveFilePath(fileId);

// Use with synchronous file operations
const buffer = fs.readFileSync(path);

// Use with libraries requiring file paths
await sharp(path).resize(800, 600).toFile("output.jpg");
await ffmpeg(path).format("mp4").save("output.mp4");

// Google Drive files are cached at: storage/library/google/{fileId}.ext
// Local files use their original location
```

### Search & Trash

-    **Search Scope**: Search automatically adapts to your current view. If you are browsing the Trash, searches will query deleted items. In the main Browser, searches query active files.
-    **Trash Management**: "Delete" moves items to Trash. From Trash, you can "Restore" items or "Delete Forever". A dedicated "Empty Trash" button is available to clear all deleted items.

### Responsive Design

-    **Desktop**: Features a unified single-row header containing Search, Group, Delete, Sort, View, and Trash controls.
-    **Mobile**: Optimizes for small screens by separating the Search bar into a full-width top row and grouping action buttons in a scrollable toolbar below.

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
