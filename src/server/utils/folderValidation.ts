// ** Circular folder reference prevention
import Drive from '@/server/database/mongoose/schema/drive';

const MAX_DEPTH = 50;

// ** Check if a folder is a descendant of another folder
export const isDescendantOf = async (props: Readonly<{
    folderId: string;
    ancestorId: string;
    owner: Record<string, unknown> | null;
    maxDepth?: number;
}>): Promise<boolean> => {
    // ** Deconstruct Props
    const { folderId, ancestorId, owner, maxDepth = MAX_DEPTH } = props;

    if (folderId === ancestorId) return true;

    let currentId: string | null = folderId;
    for (let depth = 0; depth < maxDepth && currentId; depth++) {
        const folder = await Drive.findOne(
            { _id: currentId, owner, 'information.type': 'FOLDER' },
            { parentId: 1 }
        ).lean() as { parentId?: unknown } | null;

        if (!folder) return false;
        if (folder.parentId && String(folder.parentId) === ancestorId) return true;
        currentId = folder.parentId ? String(folder.parentId) : null;
    }

    if (currentId) throw new Error('Maximum folder depth exceeded');
    return false;
};

// ** Check for circular reference when moving items
export const checkCircularReference = async (props: Readonly<{
    itemIds: string[];
    targetId: string | null;
    owner: Record<string, unknown> | null;
}>): Promise<{ hasCircular: boolean; message?: string }> => {
    // ** Deconstruct Props
    const { itemIds, targetId, owner } = props;

    if (!targetId || targetId === 'root') return { hasCircular: false };

    for (const itemId of itemIds) {
        const item = await Drive.findOne(
            { _id: itemId, owner },
            { 'information.type': 1 }
        ).lean() as { information?: { type?: string } } | null;

        if (!item || item.information?.type !== 'FOLDER') continue;

        try {
            if (await isDescendantOf({ folderId: targetId, ancestorId: itemId, owner })) {
                return { hasCircular: true, message: 'Cannot move folder into its own descendant' };
            }
        } catch (error) {
            return { hasCircular: true, message: error instanceof Error ? error.message : 'Error checking folder hierarchy' };
        }
    }

    return { hasCircular: false };
};
