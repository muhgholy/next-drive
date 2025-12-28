// Circular folder reference prevention
import Drive from '@/server/database/mongoose/schema/drive';

const MAX_DEPTH = 50;

export async function isDescendantOf(folderId: string, ancestorId: string, owner: Record<string, unknown> | null, maxDepth = MAX_DEPTH): Promise<boolean> {
    if (folderId === ancestorId) return true;

    let currentId: string | null = folderId;
    for (let depth = 0; depth < maxDepth && currentId; depth++) {
        const folder: any = await Drive.findOne({ _id: currentId, owner, 'information.type': 'FOLDER' }, { parentId: 1 }).lean();
        if (!folder) return false;
        if (folder.parentId && String(folder.parentId) === ancestorId) return true;
        currentId = folder.parentId ? String(folder.parentId) : null;
    }

    if (currentId) throw new Error('Maximum folder depth exceeded');
    return false;
}

export async function checkCircularReference(itemIds: string[], targetId: string | null, owner: Record<string, unknown> | null) {
    if (!targetId || targetId === 'root') return { hasCircular: false };

    for (const itemId of itemIds) {
        const item = await Drive.findOne({ _id: itemId, owner }, { 'information.type': 1 }).lean();
        if (!item || item.information.type !== 'FOLDER') continue;

        try {
            if (await isDescendantOf(targetId, itemId, owner)) {
                return { hasCircular: true, message: 'Cannot move folder into its own descendant' };
            }
        } catch (error) {
            return { hasCircular: true, message: error instanceof Error ? error.message : 'Error checking folder hierarchy' };
        }
    }

    return { hasCircular: false };
}
