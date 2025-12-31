import type { Readable } from 'stream';
import type { IDatabaseDriveDocument } from '@/server/database/mongoose/schema/drive';
import type { TDatabaseDrive } from '@/types/lib/database/drive';

export type TDriveQuota = {
	usedInBytes: number;
	quotaInBytes: number;
};

export type TStorageProvider = {
	name: 'LOCAL' | 'GOOGLE';

	// ** Sync operations (Populate MongoDB)
	sync: (folderId: string | null, owner: Record<string, unknown> | null, accountId?: string) => Promise<void>;
	syncTrash: (owner: Record<string, unknown> | null, accountId?: string) => Promise<void>;
	search: (query: string, owner: Record<string, unknown> | null, accountId?: string) => Promise<void>;

	// ** Read operations
	getQuota: (owner: Record<string, unknown> | null, accountId?: string, configuredQuotaInBytes?: number) => Promise<TDriveQuota>;
	openStream: (item: IDatabaseDriveDocument, accountId?: string) => Promise<{ stream: Readable; mime: string; size: number }>;
	getThumbnail: (item: IDatabaseDriveDocument, accountId?: string) => Promise<Readable>;

	// ** Write operations
	createFolder: (name: string, parentId: string | null, owner: Record<string, unknown> | null, accountId?: string) => Promise<TDatabaseDrive>;
	uploadFile: (drive: IDatabaseDriveDocument, filePath: string, accountId?: string) => Promise<TDatabaseDrive>;
	delete: (ids: string[], owner: Record<string, unknown> | null, accountId?: string) => Promise<void>;
	trash: (ids: string[], owner: Record<string, unknown> | null, accountId?: string) => Promise<void>;
	untrash: (ids: string[], owner: Record<string, unknown> | null, accountId?: string) => Promise<void>;
	rename: (id: string, newName: string, owner: Record<string, unknown> | null, accountId?: string) => Promise<TDatabaseDrive>;
	move: (id: string, newParentId: string | null, owner: Record<string, unknown> | null, accountId?: string) => Promise<TDatabaseDrive>;

	// ** Auth operations
	revokeToken: (owner: Record<string, unknown> | null, accountId?: string) => Promise<void>;
};
