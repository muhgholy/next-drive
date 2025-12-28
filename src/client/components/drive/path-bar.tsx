// ** PathBar Component
'use client';

import React from 'react';
import { useDrive } from '@/client/context';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/client/utils';
import { Button } from '@/client/components/ui/button';

// ** Droppable Path Item
const DroppablePathItem = (props: Readonly<{
    id: string | null;
    name: string;
    isLast: boolean;
    onClick: () => void;
}>) => {
    // ** Deconstruct Props
    const { id, name, isLast, onClick } = props;
    const { currentFolderId } = useDrive();
    const droppableId = `path-${id ?? 'root'}`;

    const { isOver, setNodeRef } = useDroppable({
        id: droppableId,
        data: { type: 'pathItem', folderId: id }
    });

    // Don't allow drop on current folder
    const isCurrentFolder = id === currentFolderId;

    if (isLast) {
        return (
            <span
                ref={setNodeRef}
                className={cn(
                    "font-medium text-foreground px-1 text-xs sm:text-sm truncate max-w-30 sm:max-w-none",
                    isOver && !isCurrentFolder && "bg-primary/20 rounded"
                )}
                aria-current="page"
                title={name}
            >
                {name}
            </span>
        );
    }

    return (
        <Button
            ref={setNodeRef}
            variant="ghost"
            size="sm"
            className={cn(
                "h-auto font-normal text-xs sm:text-sm px-1.5 sm:px-2 py-0.5 sm:py-1 truncate max-w-25 sm:max-w-37.5",
                isOver && !isCurrentFolder && "ring-2 ring-primary bg-primary/10 scale-105"
            )}
            onClick={onClick}
            type="button"
            title={name}
        >
            {name}
        </Button>
    );
};

export const DrivePathBar = () => {
    const { path, navigateToFolder } = useDrive();

    return (
        <ol className="flex items-center gap-1 sm:gap-1.5 text-sm text-muted-foreground bg-muted/30 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md border w-full overflow-x-auto flex-nowrap min-w-0" aria-label="Breadcrumb" role="navigation">
            {path.map((item, index) => {
                const isLast = index === path.length - 1;
                return (
                    <li key={item.id ?? 'root'} className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                        {index > 0 && <span className="text-muted-foreground/50 text-xs" aria-hidden="true">/</span>}
                        <DroppablePathItem
                            id={item.id}
                            name={item.name}
                            isLast={isLast}
                            onClick={() => navigateToFolder(item)}
                        />
                    </li>
                );
            })}
        </ol>
    );
};
