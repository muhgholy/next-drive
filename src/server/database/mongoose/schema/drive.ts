// ** Mongoose Drive Schema
import type {
    TDatabaseDrive,
    TDatabaseDriveInformation,
    TDatabaseDriveMetadata,
    TDatabaseDriveProvider,
    TDatabaseDriveStatus,
} from '@/types/lib/database/drive';
import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface IDatabaseDriveDocument extends Document {
    owner: Record<string, unknown> | null;
    storageAccountId: Types.ObjectId | null;
    name: string;
    parentId: Types.ObjectId | null;
    order: number;
    provider: TDatabaseDriveProvider;
    metadata: TDatabaseDriveMetadata;
    information: TDatabaseDriveInformation;
    status: TDatabaseDriveStatus;
    trashedAt: Date | null;
    createdAt: Date;

    toClient: () => Promise<TDatabaseDrive>;
}

// ** Schema definition
const informationSchema = new Schema({
    type: { type: String, enum: ['FILE', 'FOLDER'], required: true },
    sizeInBytes: { type: Number, default: 0 },
    mime: { type: String },
    path: { type: String },
    width: { type: Number },
    height: { type: Number },
    duration: { type: Number },
    hash: { type: String },
}, { _id: false });

// Provider Sub-schema to handle 'type' field correctly without ambiguity
const providerSchema = new Schema({
    type: { type: String, enum: ['LOCAL', 'GOOGLE'], required: true, default: 'LOCAL' },
    google: { type: Schema.Types.Mixed }
}, { _id: false });

const DriveSchema: Schema = new Schema<IDatabaseDriveDocument>(
    {
        owner: { type: Schema.Types.Mixed, default: null },
        storageAccountId: { type: Schema.Types.ObjectId, ref: 'StorageAccount', default: null },
        name: { type: String, required: true },
        parentId: { type: Schema.Types.ObjectId, ref: 'Drive', default: null },
        order: { type: Number, default: 0 },
        provider: { type: providerSchema, default: () => ({ type: 'LOCAL' }) },
        metadata: { type: Schema.Types.Mixed, default: {} },
        information: { type: informationSchema, required: true },
        status: { type: String, enum: ['READY', 'PROCESSING', 'UPLOADING', 'FAILED'], default: 'PROCESSING' },
        trashedAt: { type: Date, default: null },
        createdAt: { type: Date, default: Date.now },
    },
    { minimize: false },
);

// ** Indexes
DriveSchema.index({ owner: 1, 'information.type': 1 });
DriveSchema.index({ owner: 1, 'provider.type': 1, 'provider.google.id': 1 }); // Provider lookup updated
DriveSchema.index({ owner: 1, storageAccountId: 1 });
DriveSchema.index({ owner: 1, trashedAt: 1 });
DriveSchema.index({ owner: 1, 'information.hash': 1 });
DriveSchema.index({ owner: 1, name: 'text' });
DriveSchema.index({ owner: 1, 'provider.type': 1 });

// ** Method: toClient
DriveSchema.method<IDatabaseDriveDocument>('toClient', async function (): Promise<TDatabaseDrive> {
    const data = this.toJSON<IDatabaseDriveDocument>();

    return {
        id: String(data._id),
        name: data.name,
        parentId: data.parentId ? String(data.parentId) : null,
        order: data.order,
        provider: data.provider,
        metadata: data.metadata,
        information: data.information,
        status: data.status,
        trashedAt: data.trashedAt,
        createdAt: data.createdAt,
    };
});

const Drive: Model<IDatabaseDriveDocument> = mongoose.models.Drive || mongoose.model<IDatabaseDriveDocument>('Drive', DriveSchema);

export default Drive;

