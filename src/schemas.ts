// ** Universal Schema Exports (can be used in both client and server)
import { z } from 'zod';

// ** Drive File Schema (for validation)
export const driveFileSchemaZod = z.object({
    id: z.string(),
    file: z.object({
        name: z.string(),
        mime: z.string(),
        size: z.number(),
    }),
});

// ** Drive File Type
export type TDriveFile = z.infer<typeof driveFileSchemaZod>;
