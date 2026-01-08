// ** DriveFileGrid Component - Pure file display (no chrome)
'use client';

import React, { useMemo, useEffect, useRef } from 'react';
import type { TDatabaseDrive } from '@/types/server';
import { useDrive } from '@/client/context';
import { useDriveDnd } from '@/client/components/drive/dnd-provider';
import { formatBytes, getFileIcon, matchesMimeFilter, cn } from '@/client/utils';
import { Folder, Loader2, RotateCcw, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { Progress } from '@/client/components/ui/progress';
import { isToday, isYesterday, startOfWeek, subWeeks, isAfter } from 'date-fns';
import {
    ContextMenu,
    ContextMenuTrigger,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator
} from "@/client/components/ui/context-menu";
import { DialogConfirmation } from '@/client/components/dialog';
import { CreateFolderDialog } from '@/client/components/drive/CreateFolderDialog';
import { RenameDialog } from '@/client/components/drive/RenameDialog';
import {
    SortableContext,
    rectSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ** Sortable Item Wrapper
const SortableItem = (props: Readonly<{
    id: string;
    children: React.ReactNode;
    disabled?: boolean;
    isDragOverTarget?: boolean;
}>) => {
    // ** Deconstruct Props
    const { id, children, disabled, isDragOverTarget } = props;

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });

    const style = {
        transform: isDragOverTarget ? undefined : CSS.Transform.toString(transform),
        transition: isDragOverTarget ? 'transform 0.15s ease' : transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : 'auto',
        position: 'relative' as const,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            {children}
        </div>
    );
};

// ** File Item Component
const FileItem = (props: Readonly<{
    item: TDatabaseDrive;
    isSelected: boolean;
    isDragOver: boolean;
    onSelect: (e: React.MouseEvent) => void;
    onDoubleClick: (e: React.MouseEvent) => void;
    onRename: () => void;
    onDelete: () => void;
    onRestore?: () => void;
}>) => {
    // ** Deconstruct Props
    const { item, isSelected, isDragOver, onSelect, onDoubleClick, onRename, onDelete, onRestore } = props;

    const { apiEndpoint, viewMode, currentView } = useDrive();
    const isFolder = item.information.type === 'FOLDER';
    const tokenParam = item.token ? `&token=${item.token}` : '';
    const thumbnailUrl = `${apiEndpoint}?action=thumbnail&id=${item.id}&size=small${tokenParam}`;
    const isThumbnailable = !isFolder && item.information.type === 'FILE' && (
        item.information.mime.startsWith('image/') || item.information.mime.startsWith('video/')
    );

    return (
        <ContextMenu>
            <ContextMenuTrigger onContextMenu={(e) => e.stopPropagation()}>
                <div
                    className={cn(
                        "group relative cursor-pointer transition-all select-none",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        viewMode === 'GRID'
                            ? "flex flex-col rounded-lg sm:rounded-xl border bg-card dark:bg-card/50 hover:bg-accent/50 dark:hover:bg-accent/30 overflow-hidden"
                            : "flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-lg border border-transparent hover:bg-accent/50 dark:hover:bg-accent/30 hover:border-border",
                        isSelected && "ring-2 ring-primary border-primary/50 bg-primary/5 dark:bg-primary/10",
                        isDragOver && "ring-2 ring-primary border-primary scale-[1.02] bg-primary/10 shadow-lg"
                    )}
                    onClick={onSelect}
                    onDoubleClick={onDoubleClick}
                    role="button"
                    tabIndex={0}
                >
                    {viewMode === 'GRID' ? (
                        <>
                            <div className="aspect-square w-full bg-muted/30 dark:bg-muted/20 flex items-center justify-center overflow-hidden relative">
                                {isThumbnailable ? (
                                    <img
                                        src={thumbnailUrl}
                                        alt={item.name}
                                        className="size-full object-cover transition-transform group-hover:scale-105 duration-300"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="transition-transform group-hover:scale-110 duration-200">
                                        {getFileIcon(item.information.type === 'FILE' ? item.information.mime : '', isFolder, "size-8 sm:size-10 md:size-12 text-muted-foreground/60")}
                                    </div>
                                )}
                                {isSelected && (
                                    <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 size-5 bg-primary rounded-full flex items-center justify-center shadow-md animate-in zoom-in-50">
                                        <div className="size-2 bg-primary-foreground rounded-full" />
                                    </div>
                                )}
                                {isFolder && currentView === 'BROWSE' && (
                                    <div className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 lg:hidden size-5 sm:size-6 bg-primary/90 rounded-full flex items-center justify-center shadow-md">
                                        <ChevronRight className="size-3 sm:size-3.5 text-primary-foreground" />
                                    </div>
                                )}
                            </div>
                            <div className="p-1.5 sm:p-2">
                                <p className="text-sm font-medium truncate leading-tight" title={item.name}>{item.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {isFolder ? 'Folder' : formatBytes(item.information.type === 'FILE' ? item.information.sizeInBytes : 0)}
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="size-10 shrink-0 rounded-lg overflow-hidden bg-muted/50 dark:bg-muted/30 flex items-center justify-center">
                                {isThumbnailable ? (
                                    <img src={thumbnailUrl} alt={item.name} className="size-full object-cover" loading="lazy" />
                                ) : (
                                    getFileIcon(item.information.type === 'FILE' ? item.information.mime : '', isFolder, "size-5 text-muted-foreground")
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate" title={item.name}>{item.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {isFolder ? 'Folder' : formatBytes(item.information.type === 'FILE' ? item.information.sizeInBytes : 0)}
                                </p>
                            </div>
                            {isFolder && currentView === 'BROWSE' && (
                                <ChevronRight className="size-4 text-muted-foreground lg:hidden shrink-0" />
                            )}
                        </>
                    )}
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
                {currentView === 'TRASH' ? (
                    <>
                        <ContextMenuItem onClick={onRestore}>
                            <RotateCcw className="mr-2 size-4" /> Restore
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
                            <Trash2 className="mr-2 size-4" /> Delete Forever
                        </ContextMenuItem>
                    </>
                ) : (
                    <>
                        <ContextMenuItem onClick={onRename}>
                            <Pencil className="mr-2 size-4" /> Rename
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
                            <Trash2 className="mr-2 size-4" /> Delete
                        </ContextMenuItem>
                    </>
                )}
            </ContextMenuContent>
        </ContextMenu>
    );
};

// ** Main FileGrid Component
export const DriveFileGrid = (props: Readonly<{
    mimeFilter?: string;
    className?: string;
    selectableFolders?: boolean;
    onItemClick?: (item: TDatabaseDrive) => void;
    onItemDoubleClick?: (item: TDatabaseDrive) => void;
}>) => {
    // ** Deconstruct Props
    const { mimeFilter, className, selectableFolders = false, onItemClick, onItemDoubleClick } = props;

    const {
        items, isLoading, error, currentFolderId,
        viewMode, groupBy, sortBy,
        selectedFileIds, setSelectedFileIds, selectionMode,
        navigateToFolder, hasMore, loadMore, isLoadingMore,
        currentView, createFolder, renameItem: renameItemAction, deleteItem, restoreItem
    } = useDrive();

    // Get drag state from shared context
    const { dragOverFolderId } = useDriveDnd();

    // ** Dialog State
    const [dialogs, setDialogs] = React.useState({ newFolder: false, rename: false, delete: false });
    const [itemToDelete, setItemToDelete] = React.useState<TDatabaseDrive | null>(null);
    const [itemToRename, setItemToRename] = React.useState<TDatabaseDrive | null>(null);



    // ** Process Items
    const processedItems = useMemo(() => {
        let filtered = items;
        if (mimeFilter) {
            filtered = filtered.filter(item =>
                matchesMimeFilter(
                    item.information.type === 'FILE' ? item.information.mime : '',
                    item.information.type === 'FOLDER',
                    mimeFilter
                )
            );
        }

        return [...filtered].sort((a, b) => {
            if (a.information.type === 'FOLDER' && b.information.type !== 'FOLDER') return -1;
            if (a.information.type !== 'FOLDER' && b.information.type === 'FOLDER') return 1;
            if (sortBy.field === 'order') return 0;

            let valA: any, valB: any;
            if (sortBy.field === 'name') {
                valA = a.name.toLowerCase();
                valB = b.name.toLowerCase();
            } else if (sortBy.field === 'size') {
                valA = a.information.type === 'FILE' ? a.information.sizeInBytes : 0;
                valB = b.information.type === 'FILE' ? b.information.sizeInBytes : 0;
            } else {
                valA = new Date(a.createdAt).getTime();
                valB = new Date(b.createdAt).getTime();
            }
            if (valA < valB) return -1 * sortBy.order;
            if (valA > valB) return 1 * sortBy.order;
            return 0;
        });
    }, [items, mimeFilter, sortBy]);

    // ** Group Items
    const groupedItems = useMemo(() => {
        if (groupBy === 'NONE') return { 'All': processedItems };
        const groups: Record<string, TDatabaseDrive[]> = {
            'Today': [], 'Yesterday': [], 'Earlier this Week': [], 'Last Week': [], 'Older': []
        };
        const now = new Date();
        const startOfCurrentWeek = startOfWeek(now);
        const startOfLastWeek = startOfWeek(subWeeks(now, 1));

        processedItems.forEach(item => {
            const date = new Date(item.createdAt);
            if (isToday(date)) groups['Today'].push(item);
            else if (isYesterday(date)) groups['Yesterday'].push(item);
            else if (isAfter(date, startOfCurrentWeek)) groups['Earlier this Week'].push(item);
            else if (isAfter(date, startOfLastWeek)) groups['Last Week'].push(item);
            else groups['Older'].push(item);
        });
        return Object.fromEntries(Object.entries(groups).filter(([_, items]) => items.length > 0));
    }, [processedItems, groupBy]);

    // ** Infinite Scroll
    const observerTarget = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore && !isLoadingMore) loadMore();
        }, { threshold: 0.1 });
        if (observerTarget.current) observer.observe(observerTarget.current);
        return () => { if (observerTarget.current) observer.unobserve(observerTarget.current); };
    }, [hasMore, isLoadingMore, loadMore]);

    // ** Handlers
    // Single tap/click on folder opens it, on file selects it
    // Double click also works for folders (desktop)
    const handleItemSelect = (e: React.MouseEvent, item: TDatabaseDrive) => {
        // Don't navigate to temp folders (being created)
        if (item.id.startsWith('temp-')) return;

        // For folders in BROWSE mode - navigate into folder
        if (item.information.type === 'FOLDER' && currentView === 'BROWSE' && !selectableFolders) {
            navigateToFolder(item);
            return;
        }
        // For files or when in TRASH/SEARCH or folders are selectable, toggle selection
        toggleSelection(item);
        onItemClick?.(item);
    };

    const toggleSelection = (item: TDatabaseDrive) => {
        if (selectionMode.type === 'MULTIPLE') {
            if (selectedFileIds.includes(item.id)) {
                setSelectedFileIds(prev => prev.filter(id => id !== item.id));
            } else {
                if (selectionMode.maxFile && selectedFileIds.length >= selectionMode.maxFile) return;
                setSelectedFileIds(prev => [...prev, item.id]);
            }
        } else {
            setSelectedFileIds([item.id]);
        }
    };

    const handleItemDoubleClick = (e: React.MouseEvent, item: TDatabaseDrive) => {
        if (item.information.type === 'FOLDER' && currentView === 'BROWSE') navigateToFolder(item);
        else onItemDoubleClick?.(item);
    };

    const enableDrag = currentView === 'BROWSE';

    // ** Loading State (initial load - no items yet)
    if (isLoading && items.length === 0) {
        return (
            <div className={cn("flex-1 flex flex-col", className)}>
                <div className="h-1 w-full shrink-0">
                    <Progress
                        indeterminate
                        className="h-full rounded-none bg-primary/10"
                        indicatorClassName="bg-primary"
                    />
                </div>
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="size-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    // ** Error State
    if (error) {
        return (
            <div className={cn("flex-1 flex items-center justify-center p-8", className)}>
                <p className="text-destructive font-medium text-center">{error}</p>
            </div>
        );
    }

    // ** Empty State
    if (processedItems.length === 0) {
        return (
            <div className={cn("flex-1 flex flex-col items-center justify-center p-8 text-center", className)}>
                <div className="size-16 rounded-2xl bg-muted/50 dark:bg-muted/30 flex items-center justify-center mb-4">
                    <Folder className="size-8 text-muted-foreground/60" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                    {currentView === 'SEARCH' ? 'No files match your search' :
                        currentView === 'TRASH' ? 'Trash is empty' : 'This folder is empty'}
                </p>
            </div>
        );
    }

    // ** Main Grid
    return (
        <>
            {/* Loading Progress Bar - shows when navigating/searching with existing items */}
            {isLoading && (
                <div className="h-1 w-full shrink-0">
                    <Progress
                        indeterminate
                        className="h-full rounded-none bg-primary/10"
                        indicatorClassName="bg-primary"
                    />
                </div>
            )}

            <div className={cn("flex-1 overflow-y-auto min-h-0 p-2 sm:p-3 md:p-4", className)}>
                <div className="space-y-4 sm:space-y-6">
                    {Object.entries(groupedItems).map(([groupName, groupItems]) => (
                        <div key={groupName}>
                            {groupBy !== 'NONE' && (
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 sm:mb-3 px-1">
                                    {groupName} <span className="opacity-50">({groupItems.length})</span>
                                </h3>
                            )}
                            <SortableContext items={groupItems.map(i => i.id)} strategy={rectSortingStrategy} disabled={!enableDrag}>
                                <div className={cn(
                                    viewMode === 'GRID'
                                        ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3"
                                        : "flex flex-col gap-1"
                                )}>
                                    {groupItems.map(item => (
                                        <SortableItem
                                            key={item.id}
                                            id={item.id}
                                            disabled={!enableDrag}
                                            isDragOverTarget={item.information.type === 'FOLDER' && dragOverFolderId === item.id}
                                        >
                                            <FileItem
                                                item={item}
                                                isSelected={selectedFileIds.includes(item.id)}
                                                isDragOver={item.information.type === 'FOLDER' && dragOverFolderId === item.id}
                                                onSelect={(e) => handleItemSelect(e, item)}
                                                onDoubleClick={(e) => handleItemDoubleClick(e, item)}
                                                onRename={() => { setItemToRename(item); setDialogs(prev => ({ ...prev, rename: true })); }}
                                                onDelete={() => { setItemToDelete(item); setDialogs(prev => ({ ...prev, delete: true })); }}
                                                onRestore={() => restoreItem(item.id)}
                                            />
                                        </SortableItem>
                                    ))}
                                </div>
                            </SortableContext>
                        </div>
                    ))}
                </div>

                {hasMore && (
                    <div ref={observerTarget} className="flex justify-center py-6">
                        {isLoadingMore && <Loader2 className="size-6 animate-spin text-muted-foreground" />}
                    </div>
                )}
            </div>

            {/* Dialogs */}
            <CreateFolderDialog
                open={dialogs.newFolder}
                onClose={() => setDialogs(prev => ({ ...prev, newFolder: false }))}
                onConfirm={async (name) => {
                    await createFolder(name);
                }}
            />

            <RenameDialog
                open={dialogs.rename}
                onClose={() => { setDialogs(prev => ({ ...prev, rename: false })); setItemToRename(null); }}
                item={itemToRename}
                onConfirm={async (id, newName) => {
                    await renameItemAction(id, newName);
                    setItemToRename(null);
                }}
            />

            <DialogConfirmation
                open={dialogs.delete}
                onClose={() => { setDialogs(prev => ({ ...prev, delete: false })); setItemToDelete(null); }}
                title={currentView === 'TRASH' ? 'Delete Permanently?' : 'Move to Trash?'}
                description={currentView === 'TRASH'
                    ? `This will permanently delete "${itemToDelete?.name}". You cannot undo this action.`
                    : `Are you sure you want to move "${itemToDelete?.name}" to trash?`}
                onConfirm={async () => {
                    if (!itemToDelete) return [false, 'No item selected'];
                    await deleteItem(itemToDelete.id);
                    setItemToDelete(null);
                    return [true];
                }}
            />
        </>
    );
};
