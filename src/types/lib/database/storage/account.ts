// ** Storage Account Types

// ** Storage account metadata for Google provider
export type TDatabaseStorageAccountMetadata = {
    provider: 'GOOGLE';
    google: {
        email: string;
        credentials: Record<string, unknown>;
    };
};

// ** Storage account database record
export type TDatabaseStorageAccount = {
    id: string;
    owner: Record<string, unknown> | null;
    name: string;
    metadata: TDatabaseStorageAccountMetadata;
    createdAt: Date;
};
