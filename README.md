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

// Upload to specific folder by ID
const file = await driveUpload(
	"/tmp/photo.jpg",
	{ userId: "123" },
	{
		name: "photo.jpg",
		folder: { id: "folderId" }, // Optional: folder ID
		accountId: "LOCAL", // Optional: storage account ID
		enforce: false, // Optional: bypass quota check
	}
);

// Upload to folder by path (creates folders if not exist)
const file = await driveUpload(
	"/tmp/photo.jpg",
	{ userId: "123" },
	{
		name: "photo.jpg",
		folder: { path: "images/2024/january" }, // Creates folders recursively
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

| Option       | Type                              | Required | Description                                              |
| ------------ | --------------------------------- | -------- | -------------------------------------------------------- |
| `name`       | `string`                          | Yes      | File name with extension                                 |
| `folder.id`  | `string`                          | No       | Parent folder ID                                         |
| `folder.path`| `string`                          | No       | Folder path (e.g., `images/2024`) - creates if not exist |
| `accountId`  | `string`                          | No       | Storage account ID ('LOCAL' for local storage)           |
| `mime`       | `string`                          | No       | MIME type (auto-detected from extension if not provided) |
| `enforce`    | `boolean`                         | No       | Bypass quota check (default: false)                      |

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
/api/drive?action=serve&id={fileId}&quality={preset}&display={context}&size={scale}&format={format}
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `quality` | `low` / `medium` / `high` / `1-100` | Compression level |
| `display` | string | Sets aspect ratio, base dimensions, and quality factor |
| `size` | string | Scale factor (xs/sm/md/lg/xl) or standalone dimension preset |
| `format` | `jpeg` / `webp` / `avif` / `png` | Output format |

### How Display + Size Work Together

When **display** is specified, it defines the aspect ratio and base dimensions. The **size** parameter then scales those dimensions:

```
display=article-image + size=sm  → 400×225  (16:9, half size)
display=article-image + size=md  → 800×450  (16:9, default)
display=article-image + size=lg  → 1200×675 (16:9, 1.5x)
```

When **no display** is specified, size uses standalone presets (fixed dimensions).

### Quality Presets

| Preset | Base Quality | Use Case |
|--------|--------------|----------|
| `low` | 30 | Thumbnails, previews |
| `medium` | 50 | General content |
| `high` | 75 | High-quality display |
| `1-100` | Custom | Fine-tuned control |

> Quality is dynamically adjusted based on file size. Larger files get more aggressive compression.

### Display Presets (Aspect Ratio + Dimensions)

| Display | Aspect Ratio | Base Size | Quality Factor |
|---------|--------------|-----------|----------------|
| `article-header` | 16:9 | 1200×675 | 0.9 |
| `article-image` | 16:9 | 800×450 | 0.85 |
| `thumbnail` | 1:1 | 150×150 | 0.7 |
| `avatar` | 1:1 | 128×128 | 0.8 |
| `logo` | 2:1 | 200×100 | 0.95 |
| `card` | 4:3 | 400×300 | 0.8 |
| `gallery` | 1:1 | 600×600 | 0.85 |
| `og` | ~1.9:1 | 1200×630 | 0.9 |
| `icon` | 1:1 | 48×48 | 0.75 |
| `cover` | 16:9 | 1920×1080 | 0.9 |
| `story` | 9:16 | 1080×1920 | 0.85 |
| `video` | 16:9 | 1280×720 | 0.85 |
| `banner` | 3:1 | 1200×400 | 0.9 |
| `portrait` | 3:4 | 600×800 | 0.85 |
| `landscape` | 4:3 | 800×600 | 0.85 |

### Size Scale (with Display)

When used with a display preset, size scales the dimensions:

| Size | Scale | Example with `article-image` (800×450) |
|------|-------|----------------------------------------|
| `xs` | 0.25× | 200×113 |
| `sm` | 0.5× | 400×225 |
| `md` | 1.0× | 800×450 |
| `lg` | 1.5× | 1200×675 |
| `xl` | 2.0× | 1600×900 |
| `2xl` | 2.5× | 2000×1125 |

### Standalone Size Presets (without Display)

When no display is specified, use these fixed dimension presets:

| Size | Dimensions | Size | Dimensions |
|------|------------|------|------------|
| `xs` | 64×64 | `landscape-sm` | 480×270 |
| `sm` | 128×128 | `landscape` | 800×450 |
| `md` | 256×256 | `landscape-lg` | 1280×720 |
| `lg` | 512×512 | `portrait-sm` | 270×480 |
| `xl` | 1024×1024 | `portrait` | 450×800 |
| `icon` | 48×48 | `wide` | 1200×630 |
| `thumb` | 150×150 | `banner` | 1200×400 |
| `video` | 1280×720 | `card` | 400×300 |

### Examples

```html
<!-- Article image, smaller variant (400×225) -->
<img src="/api/drive?action=serve&id=123&display=article-image&size=sm&format=webp">

<!-- Article image, default size (800×450) -->
<img src="/api/drive?action=serve&id=123&display=article-image&format=webp">

<!-- Article image, larger variant (1200×675) -->
<img src="/api/drive?action=serve&id=123&display=article-image&size=lg&format=webp">

<!-- Thumbnail (150×150 square) -->
<img src="/api/drive?action=serve&id=123&display=thumbnail&format=webp">

<!-- Avatar, smaller (64×64) -->
<img src="/api/drive?action=serve&id=123&display=avatar&size=sm&format=webp">

<!-- Standalone size, no display -->
<img src="/api/drive?action=serve&id=123&size=landscape&format=webp">

<!-- Just quality, no resize -->
<img src="/api/drive?action=serve&id=123&quality=medium&format=webp">
```

---

## License

MIT
