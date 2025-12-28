// ** Drive Types
export type TDatabaseDriveStatus = "READY" | "PROCESSING" | "UPLOADING" | "FAILED";

// ** File metadata
export type TDatabaseDriveMetadataFile = {
    type: "FILE";
    sizeInBytes: number;
    mime: string;
    path: string;
    width?: number;
    height?: number;
    duration?: number;
    hash?: string;
};

// ** Folder metadata
export type TDatabaseDriveMetadataFolder = {
    type: "FOLDER";
};

// ** Combined information type
export type TDatabaseDriveInformation = TDatabaseDriveMetadataFile | TDatabaseDriveMetadataFolder;

// ** Provider Data
export type TDatabaseDriveProvider = {
    type: 'LOCAL' | 'GOOGLE';
    google?: {
        id: string;
        webViewLink?: string;
        iconLink?: string;
        thumbnailLink?: string;
    };
};

// ** General Metadata (Generic)
export type TDatabaseDriveMetadata = {
    [key: string]: unknown;
};

// ** Public drive item (returned from API)
export type TDatabaseDrive = {
    id: string;
    name: string;
    parentId: string | null;
    order: number;
    provider: TDatabaseDriveProvider;
    metadata: TDatabaseDriveMetadata;
    information: TDatabaseDriveInformation;
    status: TDatabaseDriveStatus;
    trashedAt: Date | null;
    createdAt: Date;
    token?: string; // Signed URL token
};
