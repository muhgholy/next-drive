// ** Server Types - Migration

// ** Migration definition for storage structure changes
export type TMigration = {
    version: number;
    name: string;
    migrate: (storagePath: string) => Promise<void>;
};
