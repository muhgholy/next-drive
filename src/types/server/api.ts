// ** Server API Types

// ** Drive Actions
export type TDriveAction =
    | 'upload'
    | 'list'
    | 'serve'
    | 'thumbnail'
    | 'rename'
    | 'delete'
    | 'deleteMany'
    | 'deletePermanent'
    | 'cancel'
    | 'createFolder'
    | 'move'
    | 'reorder'
    | 'trash'
    | 'restore'
    | 'emptyTrash'
    | 'purgeTrash'
    | 'search'
    | 'duplicates'
    | 'quota';

// ** API Response Wrapper
// ** API Response Wrapper
export interface TDriveAPIResponse<T = unknown> {
    status: number;
    message: string;
    data?: T;
    statistic?: {
        storage?: { usedInBytes: number; quotaInBytes: number };
        [key: string]: unknown;
    };
}

// ** Thumbnail Sizes
export type TDriveThumbnailSize = 'small' | 'medium' | 'large';

// ** Image Quality
export type TDriveImageQuality = 'ultralow' | 'low' | 'medium' | 'high' | 'normal';
