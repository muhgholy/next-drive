// ** Drive DnD Provider - Wraps PathBar and FileGrid for drag-drop between them
'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { useDrive } from '@/client/context';
import {
    DndContext,
    pointerWithin,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragOverEvent,
    type DragStartEvent
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';

// ** Context for sharing drag state
type DriveDndContextType = {
    dragOverFolderId: string | null;
    draggingItemId: string | null;
};

const DriveDndContext = createContext<DriveDndContextType>({
    dragOverFolderId: null,
    draggingItemId: null
});

export const useDriveDnd = () => useContext(DriveDndContext);

// ** Provider Component
export const DriveDndProvider = ({ children }: { children: React.ReactNode }) => {
    const { items, setItems, sortBy, setSortBy, moveItem, callAPI, currentView } = useDrive();

    const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
    const [draggingItemId, setDraggingItemId] = useState<string | null>(null);

    // ** DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // ** Handlers
    const handleDragStart = useCallback((event: DragStartEvent) => {
        setDraggingItemId(event.active.id as string);
    }, []);

    const handleDragOver = useCallback((event: DragOverEvent) => {
        const { over } = event;
        if (!over) {
            setDragOverFolderId(null);
            return;
        }

        const overId = over.id as string;

        // Check if hovering over a path item
        if (overId.startsWith('path-')) {
            setDragOverFolderId(overId);
            return;
        }

        // Check if hovering over a folder in the grid
        const overItem = items.find((i: { id: string }) => i.id === over.id);
        if (overItem?.information.type === 'FOLDER' && over.id !== draggingItemId) {
            setDragOverFolderId(over.id as string);
        } else {
            setDragOverFolderId(null);
        }
    }, [items, draggingItemId]);

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        setDragOverFolderId(null);
        setDraggingItemId(null);

        if (!over || active.id === over.id) return;

        const overId = over.id as string;

        // Dropping on path bar item (e.g., "path-root" or "path-abc123")
        if (overId.startsWith('path-')) {
            const pathId = overId.slice(5); // Remove "path-" prefix
            const targetFolderId = pathId === 'root' || pathId === 'null' ? 'root' : pathId;
            await moveItem(active.id as string, targetFolderId);
            return;
        }

        // Dropping on a folder in the grid
        const overItem = items.find((i: { id: string; information: { type: string } }) => i.id === over.id);
        if (overItem?.information.type === 'FOLDER') {
            await moveItem(active.id as string, over.id as string);
            return;
        }

        // Reordering items (optimistic)
        const oldIndex = items.findIndex((i: { id: string }) => i.id === active.id);
        const newIndex = items.findIndex((i: { id: string }) => i.id === over.id);

        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = arrayMove(items, oldIndex, newIndex);

        setItems(reordered);
        if (sortBy.field !== 'order') setSortBy({ field: 'order', order: 1 });

        // API call in background
        await callAPI('reorder', { method: 'POST', body: JSON.stringify({ ids: reordered.map((i: { id: string }) => i.id) }) });
    }, [items, setItems, sortBy, setSortBy, moveItem, callAPI]);

    // Only enable DnD in browse mode
    const enableDnd = currentView === 'BROWSE';

    return (
        <DriveDndContext.Provider value={{ dragOverFolderId, draggingItemId }}>
            {enableDnd ? (
                <DndContext
                    sensors={sensors}
                    collisionDetection={pointerWithin}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                >
                    {children}
                </DndContext>
            ) : (
                children
            )}
        </DriveDndContext.Provider>
    );
};
