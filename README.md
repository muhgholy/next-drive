# @muhgholy/next-drive

File storage and management for Next.js and Express apps. Includes a responsive UI, search, trash system, and secure file handling.

## Features

-    📁 **File Management** – Upload, rename, move, organize files and folders
-    🔍 **Search** – Search active files or trash with real-time filtering
-    🗑️ **Trash System** – Soft delete, restore, and empty trash
-    📱 **Responsive UI** – Optimized for desktop and mobile
-    🎬 **Video Thumbnails** – Auto-generated thumbnails (requires FFmpeg)
-    🔐 **Security** – Signed URLs and configurable upload limits
-    📊 **View Modes** – Grid/List views with sorting and grouping

---

## Installation

```bash
npm install @muhgholy/next-drive
```

### Requirements

| Dependency | Version |
| ---------- | ------- |
| Next.js    | >= 14   |
| React      | >= 18   |
| Mongoose   | >= 7    |
| TypeScript | >= 5    |

**TypeScript Configuration:**

This package uses [subpath exports](https://nodejs.org/api/packages.html#subpath-exports). Configure your `tsconfig.json` based on your project type:

**For Next.js (App Router or Pages Router):**

```json
{
	"compilerOptions": {
		"module": "esnext",
		"moduleResolution": "bundler"
	}
}
```

**For Node.js/Express servers:**

```json
{
	"compilerOptions": {
		"module": "nodenext",
		"moduleResolution": "nodenext"
	}
}
```

> ⚠️ The legacy `"moduleResolution": "node"` is **not supported** and will cause build errors with subpath imports like `@muhgholy/next-drive/server`.

**FFmpeg** (for video thumbnails):

```bash
# macOS
brew install ffmpeg

# Ubuntu
sudo apt install ffmpeg

# Windows
# Download from https://ffmpeg.org and add to PATH
```

### Styles

Styles are **automatically injected** when you import components from `@muhgholy/next-drive/client`. No additional CSS import is required!

All CSS classes are prefixed with `nd-` to avoid conflicts with your project's styles. CSS variables are scoped to the `.nd-drive-root` container class.

If styles are not loading (e.g., with certain bundler configurations), you can manually import:

```tsx
import "@muhgholy/next-drive/client/styles.css";
```

---

## Quick Start

### 1. Server Configuration

Create `lib/drive.ts` to configure storage, security, and authentication:

```typescript
// lib/drive.ts
import { driveConfiguration } from "@muhgholy/next-drive/server";
import type { TDriveConfigInformation } from "@muhgholy/next-drive/server";

driveConfiguration({
	database: "MONGOOSE",
	apiUrl: "/api/drive",
	storage: { path: "/var/data/drive" },
	security: {
		maxUploadSizeInBytes: 50 * 1024 * 1024, // 50MB
		allowedMimeTypes: ["image/*", "video/*", "application/pdf"],
		signedUrls: {
			enabled: true,
			secret: process.env.DRIVE_SECRET!,
			expiresIn: 3600, // 1 hour
		},
	},
	information: async (req): Promise<TDriveConfigInformation> => {
		const auth = await verifyAuth(req);
		if (!auth) throw new Error("Unauthenticated");
		return {
			key: { userId: auth.userId },
			storage: { quotaInBytes: 1024 * 1024 * 1024 }, // 1GB
		};
	},
});
```

### 2. API Route (Pages Router)

> ⚠️ **Important**: Must be in `pages/` folder with body parser disabled.

```typescript
// pages/api/drive.ts
import "@/lib/drive";
import { driveAPIHandler } from "@muhgholy/next-drive/server";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	return driveAPIHandler(req, res);
}

export const config = {
	api: { bodyParser: false },
};
```

### 3. Client Provider

Wrap your app with `DriveProvider`:

```tsx
// app/layout.tsx
import { DriveProvider } from "@muhgholy/next-drive/client";

export default function RootLayout({ children }) {
	return <DriveProvider apiEndpoint="/api/drive">{children}</DriveProvider>;
}
```

### 4. UI Components

**File Explorer:**

```tsx
import { DriveExplorer } from "@muhgholy/next-drive/client";

export default function DrivePage() {
	return <DriveExplorer />;
}
```

**File Picker (for forms):**

```tsx
import { useState } from "react";
import { DriveFileChooser } from "@muhgholy/next-drive/client";
import type { TDriveFile } from "@muhgholy/next-drive/client";

function MyForm() {
	const [file, setFile] = useState<TDriveFile | null>(null);
	return <DriveFileChooser value={file} onChange={setFile} accept="image/*" />;
}
```

---

## Express Integration

Use the Express adapter instead of Next.js API routes:

```typescript
// lib/drive.ts
import { driveConfigurationExpress } from "@muhgholy/next-drive/server/express";
import type { TDriveConfigInformation } from "@muhgholy/next-drive/server/express";

driveConfigurationExpress({
	database: "MONGOOSE",
	apiUrl: "/api/drive",
	storage: { path: "/var/data/drive" },
	security: {
		maxUploadSizeInBytes: 50 * 1024 * 1024,
		allowedMimeTypes: ["image/*", "video/*", "application/pdf"],
	},
	information: async (req): Promise<TDriveConfigInformation> => {
		const auth = await verifyAuth(req);
		if (!auth) throw new Error("Unauthenticated");
		return {
			key: { userId: auth.userId },
			storage: { quotaInBytes: 1024 * 1024 * 1024 },
		};
	},
});
```

```typescript
// routes/drive.ts
import "./lib/drive";
import express from "express";
import { driveAPIHandlerExpress } from "@muhgholy/next-drive/server/express";

const router = express.Router();
router.all("/drive", driveAPIHandlerExpress);

export default router;
```

> ⚠️ Don't use `express.json()` middleware on this route.

---

## Zod Validation

Validate file data in forms or API routes:

```typescript
import { z } from "zod";
import { driveFileSchemaZod } from "@muhgholy/next-drive/schemas";

const formSchema = z.object({
	asset: driveFileSchemaZod,
	title: z.string(),
});
```

> Schema also available from `/client` and `/server` exports.

---

## Client-Side File URLs

Generate URLs for displaying files:

```tsx
import { useDrive } from "@muhgholy/next-drive/client";
import type { TDriveFile } from "@muhgholy/next-drive/client";

function MyComponent({ driveFile }: { driveFile: TDriveFile }) {
	const { createUrl } = useDrive();

	// Get file URL
	const url = createUrl(driveFile);

	return <img src={url} alt={driveFile.file.name} />;
}
```

---

## Server-Side File Access

### Upload File

Upload files programmatically from server-side code:

```typescript
import { driveUpload } from "@muhgholy/next-drive/server";

// Upload from file path
const file = await driveUpload(
	"/tmp/photo.jpg",
	{ userId: "123" },
	{
		name: "photo.jpg",
		parentId: "folderId", // Optional: folder ID or null for root
		accountId: "LOCAL", // Optional: storage account ID
		enforce: false, // Optional: bypass quota check
	}
);

// Upload from stream
import fs from "fs";
const stream = fs.createReadStream("/tmp/video.mp4");
const file = await driveUpload(
	stream,
	{ userId: "123" },
	{
		name: "video.mp4",
		enforce: true, // Skip quota check
	}
);

// Upload from Buffer
const buffer = Buffer.from("file content");
const file = await driveUpload(
	buffer,
	{ userId: "123" },
	{
		name: "document.txt",
		mime: "text/plain", // Optional: specify MIME type
	}
);
```

**Options:**

| Option      | Type             | Required | Description                                              |
| ----------- | ---------------- | -------- | -------------------------------------------------------- |
| `name`      | `string`         | Yes      | File name with extension                                 |
| `parentId`  | `string \| null` | No       | Parent folder ID (null or 'root' for root)               |
| `accountId` | `string`         | No       | Storage account ID ('LOCAL' for local storage)           |
| `mime`      | `string`         | No       | MIME type (auto-detected from extension if not provided) |
| `enforce`   | `boolean`        | No       | Bypass quota check (default: false)                      |

### Get Signed URL

```typescript
import { driveGetUrl } from "@muhgholy/next-drive/server";

// Default expiry (from config)
const url = driveGetUrl(fileId);

// Custom expiry in seconds
const url = driveGetUrl(fileId, { expiry: 7200 }); // 2 hours

// Specific date
const url = driveGetUrl(fileId, { expiry: new Date("2026-12-31") });
```

### Read File Stream

```typescript
import { driveReadFile } from "@muhgholy/next-drive/server";

// Using file ID
const { stream, mime, size } = await driveReadFile(fileId);
stream.pipe(response);

// Using database document
const drive = await Drive.findById(fileId);
const { stream, mime, size } = await driveReadFile(drive);
```

### Get File/Folder Information

```typescript
import { driveInfo } from "@muhgholy/next-drive/server";

// Using file ID
const info = await driveInfo("694f5013226de007be94fcc0");
console.log(info.name, info.size, info.createdAt);
console.log(info.dimensions); // { width: 1920, height: 1080 } for images
console.log(info.duration); // 120 (seconds) for videos

// Using TDriveFile
const file = { id: "123", file: { name: "photo.jpg", mime: "image/jpeg", size: 1024 } };
const info = await driveInfo(file);
```

**Returns `TDriveInformation`:**

| Property     | Type                 | Description                          |
| ------------ | -------------------- | ------------------------------------ |
| `id`         | `string`             | File/folder ID                       |
| `name`       | `string`             | File/folder name                     |
| `type`       | `'FILE' \| 'FOLDER'` | Item type                            |
| `mime`       | `string?`            | MIME type (files only)               |
| `size`       | `number?`            | Size in bytes (files only)           |
| `hash`       | `string?`            | Content hash (files only)            |
| `dimensions` | `{width, height}?`   | Image dimensions                     |
| `duration`   | `number?`            | Video duration in seconds            |
| `status`     | `string`             | Processing status                    |
| `provider`   | `object`             | Storage provider info (LOCAL/GOOGLE) |
| `parent`     | `{id, name}?`        | Parent folder                        |
| `createdAt`  | `Date`               | Creation timestamp                   |
| `trashedAt`  | `Date \| null?`      | Trash timestamp if deleted           |

### Get Local File Path

For libraries requiring file paths (Sharp, FFmpeg, etc.):

```typescript
import { driveFilePath } from "@muhgholy/next-drive/server";

const { path, mime, size, provider } = await driveFilePath(fileId);

// Use with Sharp
await sharp(path).resize(800, 600).toFile("output.jpg");

// Use with FFmpeg
await ffmpeg(path).format("mp4").save("output.mp4");
```

> Google Drive files are automatically downloaded to local cache.

### List Files and Folders

List files and folders in a directory:

```typescript
import { driveList } from "@muhgholy/next-drive/server";

// List root folder
const items = await driveList({ key: { userId: "123" } });

// List specific folder
const items = await driveList({
	key: { userId: "123" },
	folderId: "folderIdHere",
	limit: 50,
});

// Pagination
const items = await driveList({
	key: { userId: "123" },
	folderId: "root",
	limit: 20,
	afterId: "lastItemId",
});
```

**Options:**

| Option      | Type                      | Required | Description                                    |
| ----------- | ------------------------- | -------- | ---------------------------------------------- |
| `key`       | `Record<string, unknown>` | Yes      | Owner key (must match authenticated user)      |
| `folderId`  | `string \| null`          | No       | Folder ID to list (null or 'root' for root)    |
| `accountId` | `string`                  | No       | Storage account ID ('LOCAL' for local storage) |
| `limit`     | `number`                  | No       | Maximum items to return (default: 100)         |
| `afterId`   | `string`                  | No       | Last item ID for pagination                    |

### Delete File or Folder

Permanently delete a file or folder from the drive system:

```typescript
import { driveDelete } from "@muhgholy/next-drive/server";

// Delete a file
await driveDelete("694f5013226de007be94fcc0");

// Delete a folder recursively (default behavior)
await driveDelete(folderId, { recurse: true });

// Delete only if folder is empty
try {
	await driveDelete(folderId, { recurse: false });
} catch (error) {
	// Throws error if folder contains items
	console.error("Cannot delete non-empty folder");
}

// Delete using database document
const drive = await Drive.findById(fileId);
await driveDelete(drive);

// Delete using TDatabaseDrive object
const items = await driveList({ key: { userId: "123" } });
await driveDelete(items[0]);
```

**Parameters:**

| Parameter | Type                                                 | Description                            |
| --------- | ---------------------------------------------------- | -------------------------------------- |
| `source`  | `string \| IDatabaseDriveDocument \| TDatabaseDrive` | File/folder ID or object to delete     |
| `options` | `{ recurse?: boolean }`                              | Delete options (default: recurse=true) |

**Options:**

| Option    | Type      | Default | Description                                                                               |
| --------- | --------- | ------- | ----------------------------------------------------------------------------------------- |
| `recurse` | `boolean` | `true`  | If true, deletes folder and all children. If false, throws error if folder contains items |

> **Note:** This permanently deletes the file/folder. For soft deletion (trash), use the `trash` API action instead.

---

## Configuration Options

### Security

```typescript
security: {
	maxUploadSizeInBytes: 50 * 1024 * 1024, // 50MB
	allowedMimeTypes: ['image/*', 'video/*', 'application/pdf'],
	signedUrls: {
		enabled: true,
		secret: process.env.DRIVE_SECRET!,
		expiresIn: 3600, // seconds
	},
	trash: { retentionDays: 30 },
}
```

### CORS (Cross-Origin)

Required when client and API are on different domains:

```typescript
cors: {
	enabled: true,
	origins: ['https://app.example.com'],
	credentials: true, // Allow cookies/auth headers
	maxAge: 86400, // Preflight cache (24 hours)
}
```

**Client setup for CORS:**

```tsx
<DriveProvider apiEndpoint="https://api.example.com/drive" withCredentials={true}>
	{children}
</DriveProvider>
```

| Option           | Type                 | Default                                                     | Description                     |
| ---------------- | -------------------- | ----------------------------------------------------------- | ------------------------------- |
| `enabled`        | `boolean`            | `false`                                                     | Enable CORS                     |
| `origins`        | `string \| string[]` | `'*'`                                                       | Allowed origins                 |
| `methods`        | `string[]`           | `['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']`               | Allowed HTTP methods            |
| `allowedHeaders` | `string[]`           | `['Content-Type', 'Authorization', 'X-Drive-Account']`      | Headers clients can send        |
| `exposedHeaders` | `string[]`           | `['Content-Length', 'Content-Type', 'Content-Disposition']` | Headers exposed to client       |
| `credentials`    | `boolean`            | `false`                                                     | Allow credentials               |
| `maxAge`         | `number`             | `86400`                                                     | Preflight cache duration (secs) |

> When `credentials: true`, you must specify explicit origins (not `'*'`).

---

## Google Drive Integration

### 1. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select a project
3. Enable **Google Drive API**
4. Create OAuth 2.0 credentials (Web application)
5. Add redirect URI (e.g., `http://localhost:3000/api/drive?action=callback`)

### 2. Configuration

```typescript
storage: {
	path: '/var/data/drive',
	google: {
		clientId: process.env.GOOGLE_CLIENT_ID!,
		clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
		redirectUri: process.env.GOOGLE_REDIRECT_URI!,
	},
}
```

### 3. Environment Variables

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/drive?action=callback
```

### OAuth Scopes

| Scope                                            | Description            |
| ------------------------------------------------ | ---------------------- |
| `https://www.googleapis.com/auth/drive`          | Full Drive access      |
| `https://www.googleapis.com/auth/drive.file`     | App-created files only |
| `https://www.googleapis.com/auth/drive.readonly` | Read-only access       |

---

## Image Optimization

Serve optimized images with dynamic compression, resizing, and format conversion using query parameters.

### URL Format

```
/api/drive?action=serve&id={fileId}&quality={preset}&display={context}&size={preset}&format={format}
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `quality` | `low` / `medium` / `high` / `1-100` | Compression level |
| `display` | string | Context-based quality adjustment |
| `size` | string | Predefined dimensions preset |
| `format` | `jpeg` / `webp` / `avif` / `png` | Output format |

### Quality Presets

| Preset | Base Quality | Use Case |
|--------|--------------|----------|
| `low` | 30 | Thumbnails, previews |
| `medium` | 50 | General content |
| `high` | 75 | High-quality display |
| `1-100` | Custom | Fine-tuned control |

> Quality is dynamically adjusted based on file size. Larger files get more aggressive compression.

### Display Presets (Quality Context)

| Display | Quality Factor | Use Case |
|---------|----------------|----------|
| `article-header` | 0.9 | Hero/banner images |
| `article-image` | 0.85 | In-content images |
| `thumbnail` | 0.7 | Small previews |
| `avatar` | 0.8 | Profile pictures |
| `logo` | 0.95 | Branding/logos |
| `card` | 0.8 | Card components |
| `gallery` | 0.85 | Gallery/grid |
| `og` | 0.9 | Open Graph/social |
| `icon` | 0.75 | Small icons |
| `cover` | 0.9 | Full-width covers |
| `story` | 0.85 | Story/vertical |

### Size Presets (Dimensions)

**Square Sizes:**
| Size | Dimensions |
|------|------------|
| `xs` | 64×64 |
| `sm` | 128×128 |
| `md` | 256×256 |
| `lg` | 512×512 |
| `xl` | 1024×1024 |
| `2xl` | 1600×1600 |
| `icon` | 48×48 |
| `thumb` | 150×150 |
| `square` | 600×600 |
| `avatar-sm` | 64×64 |
| `avatar-md` | 128×128 |
| `avatar-lg` | 256×256 |

**Landscape (16:9):**
| Size | Dimensions |
|------|------------|
| `landscape-sm` | 480×270 |
| `landscape` | 800×450 |
| `landscape-lg` | 1280×720 |
| `landscape-xl` | 1920×1080 |

**Portrait (9:16):**
| Size | Dimensions |
|------|------------|
| `portrait-sm` | 270×480 |
| `portrait` | 450×800 |
| `portrait-lg` | 720×1280 |

**Wide/Banner:**
| Size | Dimensions | Ratio |
|------|------------|-------|
| `wide` | 1200×630 | OG standard |
| `banner` | 1200×400 | 3:1 |
| `banner-sm` | 800×200 | 4:1 |

**Other:**
| Size | Dimensions | Ratio |
|------|------------|-------|
| `photo-4x3` | 800×600 | 4:3 |
| `photo-3x2` | 900×600 | 3:2 |
| `story` | 1080×1920 | 9:16 |
| `video` | 1280×720 | 16:9 |
| `video-sm` | 640×360 | 16:9 |
| `card-sm` | 300×200 | 3:2 |
| `card` | 400×300 | 4:3 |
| `card-lg` | 600×400 | 3:2 |

### Examples

```html
<!-- Article header with OG dimensions -->
<img src="/api/drive?action=serve&id=123&display=article-header&size=wide&format=webp">

<!-- Thumbnail with aggressive compression -->
<img src="/api/drive?action=serve&id=123&display=thumbnail&size=thumb&format=webp">

<!-- Avatar -->
<img src="/api/drive?action=serve&id=123&display=avatar&size=avatar-md&format=webp">

<!-- Gallery image -->
<img src="/api/drive?action=serve&id=123&display=gallery&size=landscape&format=webp">

<!-- Just quality, no resize -->
<img src="/api/drive?action=serve&id=123&quality=medium&format=webp">
```

---

## License

MIT
