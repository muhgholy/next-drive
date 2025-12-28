// ** Mongoose Storage Account Schema
import type { TDatabaseStorageAccount, TDatabaseStorageAccountMetadata } from '@/types/lib/database/storage/account';
import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface IDatabaseStorageAccountDocument extends Document {
    owner: Record<string, unknown> | null;
    name: string;
    metadata: TDatabaseStorageAccountMetadata;
    createdAt: Date;

    toClient: () => Promise<TDatabaseStorageAccount>;
}

// ** Schema definition
const StorageAccountSchema: Schema = new Schema<IDatabaseStorageAccountDocument>(
    {
        owner: { type: Schema.Types.Mixed, default: null },
        name: { type: String, required: true },
        metadata: {
            provider: { type: String, enum: ['GOOGLE'], required: true },
            google: {
                email: { type: String, required: true },
                credentials: { type: Schema.Types.Mixed, required: true },
            },
        },
        createdAt: { type: Date, default: Date.now },
    },
    { minimize: false }
);

// ** Indexes
StorageAccountSchema.index({ owner: 1, 'metadata.provider': 1 });
StorageAccountSchema.index({ owner: 1, 'metadata.google.email': 1 });

// ** Method: toClient
StorageAccountSchema.method<IDatabaseStorageAccountDocument>('toClient', async function (): Promise<TDatabaseStorageAccount> {
    const data = this.toJSON<IDatabaseStorageAccountDocument>();

    return {
        id: String(data._id),
        owner: data.owner,
        name: data.name,
        metadata: data.metadata,
        createdAt: data.createdAt,
    };
});

const StorageAccount: Model<IDatabaseStorageAccountDocument> = mongoose.models.StorageAccount || mongoose.model<IDatabaseStorageAccountDocument>('StorageAccount', StorageAccountSchema);

export default StorageAccount;
