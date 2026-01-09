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
                    "nd-font-medium nd-text-foreground nd-px-1 nd-text-xs sm:nd-text-sm nd-truncate nd-max-w-30 sm:nd-max-w-none",
                    isOver && !isCurrentFolder && "nd-bg-primary/20 nd-rounded"
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
                "nd-h-6 nd-font-normal nd-text-xs sm:nd-text-sm nd-px-1.5 sm:nd-px-2 nd-truncate nd-max-w-25 sm:nd-max-w-37.5",
                isOver && !isCurrentFolder && "nd-ring-2 nd-ring-primary nd-bg-primary/10 nd-scale-105"
            )}
            onClick={onClick}
            type="button"
            title={name}
        >
            {name}
        </Button>
    );
};

export const DrivePathBar = ({ className }: { className?: string }) => {
    const { path, navigateToFolder } = useDrive();

    return (
        <ol className={cn("nd-flex nd-items-center nd-gap-1 sm:nd-gap-1.5 nd-text-sm nd-text-muted-foreground nd-overflow-x-auto nd-flex-nowrap nd-min-w-0", className)} aria-label="Breadcrumb" role="navigation">
            {path.map((item, index) => {
                const isLast = index === path.length - 1;
                return (
                    <li key={item.id ?? 'root'} className="nd-flex nd-items-center nd-gap-1 sm:nd-gap-1.5 nd-shrink-0">
                        {index > 0 && <span className="nd-text-muted-foreground/50 nd-text-xs" aria-hidden="true">/</span>}
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
