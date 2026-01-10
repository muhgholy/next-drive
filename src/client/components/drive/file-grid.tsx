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
                        "group nd:relative nd:cursor-pointer nd:transition-all nd:select-none",
                        "nd:focus:outline-none nd:focus-visible:ring-2 nd:focus-visible:ring-primary",
                        viewMode === 'GRID'
                            ? "nd:flex nd:flex-col nd:rounded-lg nd:sm:rounded-xl nd:border nd:bg-card nd:dark:bg-card/50 nd:hover:bg-accent/50 nd:dark:hover:bg-accent/30 nd:overflow-hidden"
                            : "nd:flex nd:items-center nd:gap-2 nd:sm:gap-3 nd:p-1.5 nd:sm:p-2 nd:rounded-lg nd:border nd:border-transparent nd:hover:bg-accent/50 nd:dark:hover:bg-accent/30 nd:hover:border-border",
                        isSelected && "nd:ring-2 nd:ring-primary nd:border-primary/50 nd:bg-primary/5 nd:dark:bg-primary/10",
                        isDragOver && "nd:ring-2 nd:ring-primary nd:border-primary nd:scale-[1.02] nd:bg-primary/10 nd:shadow-lg"
                    )}
                    onClick={onSelect}
                    onDoubleClick={onDoubleClick}
                    role="button"
                    tabIndex={0}
                >
                    {viewMode === 'GRID' ? (
                        <>
                            <div className="nd:aspect-square nd:w-full nd:bg-muted/30 nd:dark:bg-muted/20 nd:flex nd:items-center nd:justify-center nd:overflow-hidden nd:relative">
                                {isThumbnailable ? (
                                    <img
                                        src={thumbnailUrl}
                                        alt={item.name}
                                        className="nd:size-full nd:object-cover nd:transition-transform group-nd:hover:scale-105 nd:duration-300"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="nd:transition-transform group-nd:hover:scale-110 nd:duration-200">
                                        {getFileIcon(item.information.type === 'FILE' ? item.information.mime : '', isFolder, "nd:size-8 nd:sm:size-10 nd:md:size-12 nd:text-muted-foreground/60")}
                                    </div>
                                )}
                                {isSelected && (
                                    <div className="nd:absolute nd:top-1.5 nd:right-1.5 nd:sm:top-2 nd:sm:right-2 nd:size-5 nd:bg-primary nd:rounded-full nd:flex nd:items-center nd:justify-center nd:shadow-md nd:animate-in nd:zoom-in-50">
                                        <div className="nd:size-2 nd:bg-primary-foreground nd:rounded-full" />
                                    </div>
                                )}
                                {isFolder && currentView === 'BROWSE' && (
                                    <div className="nd:absolute nd:bottom-1.5 nd:right-1.5 nd:sm:bottom-2 nd:sm:right-2 nd:lg:hidden nd:size-5 nd:sm:size-6 nd:bg-primary/90 nd:rounded-full nd:flex nd:items-center nd:justify-center nd:shadow-md">
                                        <ChevronRight className="nd:size-3 nd:sm:size-3.5 nd:text-primary-foreground" />
                                    </div>
                                )}
                            </div>
                            <div className="nd:p-1.5 nd:sm:p-2">
                                <p className="nd:text-sm nd:font-medium nd:truncate nd:leading-tight" title={item.name}>{item.name}</p>
                                <p className="nd:text-xs nd:text-muted-foreground nd:mt-0.5">
                                    {isFolder ? 'Folder' : formatBytes(item.information.type === 'FILE' ? item.information.sizeInBytes : 0)}
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="nd:size-10 nd:shrink-0 nd:rounded-lg nd:overflow-hidden nd:bg-muted/50 nd:dark:bg-muted/30 nd:flex nd:items-center nd:justify-center">
                                {isThumbnailable ? (
                                    <img src={thumbnailUrl} alt={item.name} className="nd:size-full nd:object-cover" loading="lazy" />
                                ) : (
                                    getFileIcon(item.information.type === 'FILE' ? item.information.mime : '', isFolder, "nd:size-5 nd:text-muted-foreground")
                                )}
                            </div>
                            <div className="nd:flex-1 nd:min-w-0">
                                <p className="nd:text-sm nd:font-medium nd:truncate" title={item.name}>{item.name}</p>
                                <p className="nd:text-xs nd:text-muted-foreground">
                                    {isFolder ? 'Folder' : formatBytes(item.information.type === 'FILE' ? item.information.sizeInBytes : 0)}
                                </p>
                            </div>
                            {isFolder && currentView === 'BROWSE' && (
                                <ChevronRight className="nd:size-4 nd:text-muted-foreground nd:lg:hidden nd:shrink-0" />
                            )}
                        </>
                    )}
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
                {currentView === 'TRASH' ? (
                    <>
                        <ContextMenuItem onClick={onRestore}>
                            <RotateCcw className="nd:mr-2 nd:size-4" /> Restore
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem className="nd:text-destructive nd:focus:text-destructive" onClick={onDelete}>
                            <Trash2 className="nd:mr-2 nd:size-4" /> Delete Forever
                        </ContextMenuItem>
                    </>
                ) : (
                    <>
                        <ContextMenuItem onClick={onRename}>
                            <Pencil className="nd:mr-2 nd:size-4" /> Rename
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem className="nd:text-destructive nd:focus:text-destructive" onClick={onDelete}>
                            <Trash2 className="nd:mr-2 nd:size-4" /> Delete
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

            let valA: string | number;
            let valB: string | number;
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
            <div className={cn("nd:flex-1 nd:flex nd:flex-col", className)}>
                <div className="nd:h-1 nd:w-full nd:shrink-0">
                    <Progress
                        indeterminate
                        className="nd:h-full nd:rounded-none nd:bg-primary/10"
                        indicatorClassName="nd:bg-primary"
                    />
                </div>
                <div className="nd:flex-1 nd:flex nd:items-center nd:justify-center">
                    <Loader2 className="nd:size-8 nd:animate-spin nd:text-muted-foreground" />
                </div>
            </div>
        );
    }

    // ** Error State
    if (error) {
        return (
            <div className={cn("nd:flex-1 nd:flex nd:items-center nd:justify-center nd:p-8", className)}>
                <p className="nd:text-destructive nd:font-medium nd:text-center">{error}</p>
            </div>
        );
    }

    // ** Empty State
    if (processedItems.length === 0) {
        return (
            <div className={cn("nd:flex-1 nd:flex nd:flex-col nd:items-center nd:justify-center nd:p-8 nd:text-center", className)}>
                <div className="nd:size-16 nd:rounded-2xl nd:bg-muted/50 nd:dark:bg-muted/30 nd:flex nd:items-center nd:justify-center nd:mb-4">
                    <Folder className="nd:size-8 nd:text-muted-foreground/60" />
                </div>
                <p className="nd:text-sm nd:font-medium nd:text-muted-foreground">
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
                <div className="nd:h-1 nd:w-full nd:shrink-0">
                    <Progress
                        indeterminate
                        className="nd:h-full nd:rounded-none nd:bg-primary/10"
                        indicatorClassName="nd:bg-primary"
                    />
                </div>
            )}

            <div className={cn("nd:flex-1 nd:overflow-y-auto nd:min-h-0 nd:p-2 nd:sm:p-3 nd:md:p-4", className)}>
                <div className="nd:space-y-4 nd:sm:space-y-6">
                    {Object.entries(groupedItems).map(([groupName, groupItems]) => (
                        <div key={groupName}>
                            {groupBy !== 'NONE' && (
                                <h3 className="nd:text-xs nd:font-semibold nd:text-muted-foreground nd:uppercase nd:tracking-wide nd:mb-2 nd:sm:mb-3 nd:px-1">
                                    {groupName} <span className="nd:opacity-50">({groupItems.length})</span>
                                </h3>
                            )}
                            <SortableContext items={groupItems.map(i => i.id)} strategy={rectSortingStrategy} disabled={!enableDrag}>
                                <div className={cn(
                                    viewMode === 'GRID'
                                        ? "nd:grid nd:grid-cols-3 nd:sm:grid-cols-4 nd:md:grid-cols-5 nd:lg:grid-cols-6 nd:xl:grid-cols-7 nd:gap-2 nd:sm:gap-3"
                                        : "nd:flex nd:flex-col nd:gap-1"
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
                    <div ref={observerTarget} className="nd:flex nd:justify-center nd:py-6">
                        {isLoadingMore && <Loader2 className="nd:size-6 nd:animate-spin nd:text-muted-foreground" />}
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
