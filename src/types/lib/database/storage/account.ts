// ** Storage Account Types
export type TDatabaseStorageAccountMetadata = {
    provider: 'GOOGLE';
    google: {
        email: string;
        credentials: Record<string, any>; // Stores access_token, refresh_token, etc.
    };
};

export type TDatabaseStorageAccount = {
    id: string;
    owner: Record<string, unknown> | null;
    name: string;
    metadata: TDatabaseStorageAccountMetadata;
    createdAt: Date;
};
