// ** DriveExplorer Component
'use client';

import React, { useMemo, useEffect, useRef } from 'react';
import type { TDatabaseDrive } from '@/types/server';
import { useDrive } from '@/client/context';
import { formatBytes, getFileIcon, matchesMimeFilter, cn } from '@/client/utils';
import { Folder, Loader2, Info, RotateCcw, ChevronRight } from 'lucide-react';
import { isToday, isYesterday, startOfWeek, subWeeks, isAfter } from 'date-fns';
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuShortcut } from "@/client/components/ui/context-menu";
import { DialogConfirmation } from '@/client/components/dialog';
import { Pencil, Trash2, FolderPlus } from "lucide-react";
import { DriveFileDetails } from '@/client/components/drive/file/details';
import { DrivePathBar } from '@/client/components/drive/path-bar';
import { DriveUpload } from '@/client/components/drive/upload';
import { DriveSidebar } from '@/client/components/drive/sidebar';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragOverEvent,
    type DragStartEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ** Sortable Item Wrapper
const SortableItem = ({ id, children, disabled, isDragOverTarget }: { id: string; children: React.ReactNode; disabled?: boolean; isDragOverTarget?: boolean }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id, disabled });

    // Don't apply transform when this is a folder being hovered (prevents sliding)
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

export const DriveExplorer = (props: Readonly<{
    onItemClick?: (item: TDatabaseDrive) => void;
    onItemDoubleClick?: (item: TDatabaseDrive) => void;
    mimeFilter?: string;
    className?: string;
    selectableFolders?: boolean;
}>) => {
    const { onItemClick, onItemDoubleClick, mimeFilter, className, selectableFolders = false } = props;
    const {
        items, isLoading, error, apiEndpoint, currentFolderId,
        setItems,
        viewMode, groupBy, sortBy, setSortBy,
        selectedFileIds, setSelectedFileIds, selectionMode,
        navigateToFolder, hasMore, loadMore, isLoadingMore,
        refreshItems, callAPI, currentView, moveItem, deleteItems
    } = useDrive();

    // ** Dialog State
    const [dialogs, setDialogs] = React.useState({
        newFolder: false,
        rename: false,
        delete: false
    });
    const [itemToDelete, setItemToDelete] = React.useState<TDatabaseDrive | null>(null);

    // ** Item State
    const [renameItem, setRenameItem] = React.useState<TDatabaseDrive | null>(null);
    const [detailsItem, setDetailsItem] = React.useState<TDatabaseDrive | null>(null);

    // ** Drag & Drop State
    const [dragOverFolderId, setDragOverFolderId] = React.useState<string | null>(null);
    const [draggingItemId, setDraggingItemId] = React.useState<string | null>(null);

    // ** Dnd Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), // Prevent drag on simple click
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // ** Handle Drag Start
    const handleDragStart = (event: DragStartEvent) => {
        setDraggingItemId(event.active.id as string);
    };

    // ** Handle Drag Over (track folder hover)
    const handleDragOver = (event: DragOverEvent) => {
        const { over } = event;
        if (!over) {
            setDragOverFolderId(null);
            return;
        }
        const overItem = items.find(i => i.id === over.id);
        if (overItem?.information.type === 'FOLDER' && over.id !== draggingItemId) {
            setDragOverFolderId(over.id as string);
        } else {
            setDragOverFolderId(null);
        }
    };

    // ** Handle Drag End
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setDragOverFolderId(null);
        setDraggingItemId(null);

        if (!over || active.id === over.id) {
            return;
        }

        // Check if dropping on a path bar item
        const overId = over.id as string;
        if (overId.startsWith('path-')) {
            const targetFolderId = overId.replace('path-', '');
            // Move to target folder (root = 'root')
            await moveItem(active.id as string, targetFolderId === 'root' ? 'root' : targetFolderId);
            return;
        }

        const overItem = items.find(i => i.id === over.id);
        const activeItem = items.find(i => i.id === active.id);

        // If dropping on a folder (and not the item itself), MOVE into folder
        if (overItem?.information.type === 'FOLDER' && activeItem) {
            await moveItem(active.id as string, over.id as string);
            return;
        }

        // Otherwise, reorder
        // Optimistic Update
        setItems((prevItems) => {
            const oldIndex = prevItems.findIndex((i) => i.id === active.id);
            const newIndex = prevItems.findIndex((i) => i.id === over.id);
            return arrayMove(prevItems, oldIndex, newIndex);
        });

        // Switch to custom order if not already
        if (sortBy.field !== 'order') {
            setSortBy({ field: 'order', order: 1 });
        }

        // Sync with Server
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newOrderIds = arrayMove(items, oldIndex, newIndex).map(i => i.id);

        await callAPI('reorder', {
            method: 'POST',
            body: JSON.stringify({ ids: newOrderIds })
        });
    };

    // ** Filter & Sort Items (Memoized)
    // Note: If we drag, we update 'items'. The Memo needs to respect 'items' order if sortBy.field === 'order'.
    const processedItems = useMemo(() => {
        let filtered = items;

        if (mimeFilter) {
            filtered = filtered.filter(item => matchesMimeFilter(item.information.type === 'FILE' ? item.information.mime : '', item.information.type === 'FOLDER', mimeFilter));
        }

        return [...filtered].sort((a, b) => {
            // Always folders first
            if (a.information.type === 'FOLDER' && b.information.type !== 'FOLDER') return -1;
            if (a.information.type !== 'FOLDER' && b.information.type === 'FOLDER') return 1;

            const field = sortBy.field;
            const order = sortBy.order;

            if (field === 'order') {
                // If we are sorting by order, we trust the array index implicity or use explicit order field if stable.
                // However, dnd-kit arrayMove changes array index.
                // But DB store `order` number.
                // Since we update `items` state array order on drag, we should just return 0 (maintain array order)
                // OR sort by `a.order - b.order`.
                // If we optimistically update `items` array, we prefer the Array Order if field is 'order'.
                // But backend `reorder` updates `order` field.
                // Let's rely on Array Order if 'order', assuming `items` is loaded sorted by order initially?
                // `refreshItems` calls `list`. API `list` usually sorts by default.
                // If `sortBy.field` is 'order', we want to respect the current array order (which dnd manipulates).
                return 0; // Maintain array index order
            }

            let valA: any, valB: any;

            if (field === 'name') {
                valA = a.name.toLowerCase();
                valB = b.name.toLowerCase();
            } else if (field === 'size') {
                valA = a.information.type === 'FILE' ? a.information.sizeInBytes : 0;
                valB = b.information.type === 'FILE' ? b.information.sizeInBytes : 0;
            } else { // createdAt / default
                valA = new Date(a.createdAt).getTime();
                valB = new Date(b.createdAt).getTime();
            }

            if (valA < valB) return -1 * order;
            if (valA > valB) return 1 * order;
            return 0;
        });
    }, [items, mimeFilter, sortBy]);

    // ** Group Items
    const groupedItems = useMemo(() => {
        if (groupBy === 'NONE') return { 'All': processedItems };
        // ... grouping logic same as before ...
        const groups: Record<string, TDatabaseDrive[]> = {
            'Today': [],
            'Yesterday': [],
            'Earlier this Week': [],
            'Last Week': [],
            'Older': []
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

    // ** Infinite Scroll Observer
    const observerTarget = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore && !isLoadingMore) loadMore();
        }, { threshold: 0.1 });
        if (observerTarget.current) observer.observe(observerTarget.current);
        return () => { if (observerTarget.current) observer.unobserve(observerTarget.current); };
    }, [hasMore, isLoadingMore, loadMore]);

    // ** Touch/Tap State for mobile double-tap detection
    const lastTapTime = useRef<number>(0);
    const lastTapItemId = useRef<string | null>(null);
    const tapTimeout = useRef<NodeJS.Timeout | null>(null);

    // ** Handlers
    const handleItemClick = (e: React.MouseEvent | React.TouchEvent, item: TDatabaseDrive) => {
        // Detect if this is a touch event
        const isTouchEvent = e.type === 'touchend';

        if (isTouchEvent) {
            // Handle touch/tap for mobile
            const now = Date.now();
            const timeSinceLastTap = now - lastTapTime.current;
            const isSameItem = lastTapItemId.current === item.id;

            // Double-tap detection (within 300ms on same item)
            if (timeSinceLastTap < 300 && isSameItem) {
                // Clear any pending single tap action
                if (tapTimeout.current) {
                    clearTimeout(tapTimeout.current);
                    tapTimeout.current = null;
                }

                // Double-tap detected - open folder or file
                if (item.information.type === 'FOLDER' && currentView === 'BROWSE') {
                    navigateToFolder(item);
                } else {
                    onItemDoubleClick?.(item);
                }

                // Reset tap tracking
                lastTapTime.current = 0;
                lastTapItemId.current = null;
                return;
            }

            // Single tap - schedule selection after delay (to allow double-tap)
            lastTapTime.current = now;
            lastTapItemId.current = item.id;

            // Clear any previous timeout
            if (tapTimeout.current) clearTimeout(tapTimeout.current);

            // For folders, open immediately on single tap (more mobile-friendly)
            if (item.information.type === 'FOLDER' && currentView === 'BROWSE' && !selectableFolders) {
                tapTimeout.current = setTimeout(() => {
                    navigateToFolder(item);
                    if (onItemClick) onItemClick(item);
                }, 250); // Short delay to allow double-tap
            } else {
                // For files, select immediately
                if (onItemClick) onItemClick(item);
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
            }
        } else {
            // Mouse click - original behavior
            if (item.information.type === 'FOLDER' && !selectableFolders) {
                if (onItemClick) onItemClick(item);
                return;
            }
            if (onItemClick) onItemClick(item);
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
        }
    };

    const handleItemDoubleClick = (e: React.MouseEvent, item: TDatabaseDrive) => {
        // This is for mouse double-click on desktop
        if (item.information.type === 'FOLDER') {
            if (currentView === 'BROWSE') navigateToFolder(item);
        }
        else onItemDoubleClick?.(item);
    };

    // Cleanup tap timeout on unmount
    useEffect(() => {
        return () => {
            if (tapTimeout.current) clearTimeout(tapTimeout.current);
        };
    }, []);


    const enableDrag = currentView === 'BROWSE';

    const stateContent = (() => {
        // Loading State
        if (isLoading && items.length === 0) {
            return <div className="flex items-center justify-center py-12 flex-1"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
        }
        // Error State
        if (error) {
            return <div className="flex items-center justify-center p-12 text-destructive bg-destructive/10 rounded-lg flex-1">{error}</div>;
        }
        // Empty State
        if (processedItems.length === 0) {
            return (
                <ContextMenu>
                    <ContextMenuTrigger asChild>
                        <div className={cn("flex flex-col items-center justify-center py-12 text-center flex-1", className)}>
                            <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3"><Folder className="size-6 text-muted-foreground" /></div>
                            <p className="text-sm text-muted-foreground">
                                {currentView === 'SEARCH' ? 'No files match your search' :
                                    currentView === 'TRASH' ? 'Trash is empty' : 'No files found'}
                            </p>
                            {currentView === 'BROWSE' && <p className="text-xs text-muted-foreground/60 mt-1">Right-click to create a folder</p>}
                        </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                        {currentView === 'BROWSE' ? (
                            <ContextMenuItem onClick={() => setDialogs(prev => ({ ...prev, newFolder: true }))}>
                                <FolderPlus className="mr-2 size-4" /> New Folder
                            </ContextMenuItem>
                        ) : (
                            <div className="px-2 py-6 text-center">
                                <p className="text-xs text-muted-foreground">No actions available</p>
                            </div>
                        )}
                    </ContextMenuContent>
                </ContextMenu>
            );
        }
        // Normal content (files/folders) - rendered below in main return
        return null;
    })();

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
            <div className="flex flex-col h-full w-full overflow-hidden bg-background/50">
                {/* Header Row */}
                <div className="h-14 px-3 sm:px-4 border-b bg-background/95 backdrop-blur-sm shrink-0 flex items-center gap-3">
                    {/* Mobile Menu Button */}
                    <div className="lg:hidden">
                        <DriveSidebar />
                    </div>

                    {/* Path Bar - Desktop Only */}
                    <div className="hidden lg:flex flex-1 min-w-0">
                        <DrivePathBar />
                    </div>

                    <DriveUpload compact onComplete={() => refreshItems()} />
                </div>

                {/* Path Bar - Mobile (Separate Row) */}
                <div className="lg:hidden px-3 py-2 border-b bg-background/95 backdrop-blur-sm shrink-0">
                    <DrivePathBar />
                </div>
                {stateContent || (
                    <ContextMenu>
                        <ContextMenuTrigger asChild>
                            <div className={cn("flex-1 overflow-y-auto min-h-0 container mx-auto p-2 sm:p-3 md:p-4", className)}>
                                <div className="space-y-4 sm:space-y-6 pb-8 sm:pb-12">
                                    {Object.entries(groupedItems).map(([groupName, groupItems]) => (
                                        <div key={groupName} className="space-y-3">
                                            {groupBy !== 'NONE' && (
                                                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                                    {groupName} <span className="text-xs opacity-50">({groupItems.length})</span>
                                                </h3>
                                            )}
                                            <SortableContext items={groupItems.map(i => i.id)} strategy={rectSortingStrategy} disabled={!enableDrag}>
                                                <div className={cn(
                                                    viewMode === 'GRID'
                                                        ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 sm:gap-3 md:gap-4"
                                                        : "flex flex-col gap-1"
                                                )}>
                                                    {groupItems.map(item => {
                                                        const isSelected = selectedFileIds.includes(item.id);
                                                        const isFolder = item.information.type === 'FOLDER';
                                                        const isDragOver = isFolder && dragOverFolderId === item.id;
                                                        const tokenParam = item.token ? `&token=${item.token}` : '';
                                                        const fileUrl = `${apiEndpoint}?action=serve&id=${item.id}${tokenParam}`;
                                                        const thumbnailUrl = `${apiEndpoint}?action=thumbnail&id=${item.id}&size=${viewMode === 'GRID' ? 'medium' : 'small'}${tokenParam}`;
                                                        const isThumbnailable = !isFolder && item.information.type === 'FILE' && (
                                                            item.information.mime.startsWith('image/') || item.information.mime.startsWith('video/')
                                                        );

                                                        return (
                                                            <SortableItem key={item.id} id={item.id} disabled={!enableDrag} isDragOverTarget={isDragOver}>
                                                                <ContextMenu>
                                                                    <ContextMenuTrigger>
                                                                        <div
                                                                            className={cn(
                                                                                "group relative cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                                                                                viewMode === 'GRID'
                                                                                    ? "flex flex-col rounded-xl border bg-card hover:bg-accent/50 hover:shadow-sm overflow-hidden"
                                                                                    : "flex items-center p-2 rounded-lg hover:bg-accent/50 gap-3 border border-transparent hover:border-border",
                                                                                isSelected && "ring-2 ring-primary border-primary/50 bg-accent/30",
                                                                                isDragOver && "ring-2 ring-primary border-primary scale-[1.02] bg-primary/10 shadow-lg transition-transform"
                                                                            )}
                                                                            onClick={(e) => handleItemClick(e, item)}
                                                                            onTouchEnd={(e) => {
                                                                                e.preventDefault(); // Prevent ghost clicks
                                                                                handleItemClick(e, item);
                                                                            }}
                                                                            onDoubleClick={(e) => handleItemDoubleClick(e, item)}
                                                                            role="button"
                                                                            tabIndex={0}
                                                                        >
                                                                            {viewMode === 'GRID' ? (
                                                                                <>
                                                                                    <div className="aspect-square w-full bg-muted/20 flex items-center justify-center overflow-hidden relative">
                                                                                        {isThumbnailable ? (
                                                                                            <img src={thumbnailUrl} alt={item.name} className="size-full object-contain transition-transform group-hover:scale-105 duration-300" loading="lazy" />
                                                                                        ) : (
                                                                                            <div className="transition-transform group-hover:scale-110 duration-200">
                                                                                                {getFileIcon(item.information.type === 'FILE' ? item.information.mime : '', isFolder, "size-10 text-muted-foreground/70")}
                                                                                            </div>
                                                                                        )}
                                                                                        {isSelected && (
                                                                                            <div className="absolute top-2 right-2 size-5 bg-primary rounded-full flex items-center justify-center shadow-sm animate-in zoom-in-50">
                                                                                                <div className="size-2 bg-primary-foreground rounded-full" />
                                                                                            </div>
                                                                                        )}
                                                                                        {/* Mobile tap indicator for folders */}
                                                                                        {isFolder && currentView === 'BROWSE' && (
                                                                                            <div className="absolute bottom-2 right-2 lg:hidden size-6 bg-primary/90 rounded-full flex items-center justify-center shadow-md">
                                                                                                <ChevronRight className="size-3.5 text-primary-foreground" />
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="p-3">
                                                                                        <div className="flex items-start justify-between gap-2">
                                                                                            <span className="text-sm font-medium truncate w-full text-card-foreground" title={item.name}>
                                                                                                {item.name}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                                                                                            <span>{isFolder ? 'Folder' : formatBytes(item.information.type === 'FILE' ? item.information.sizeInBytes : 0)}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <div className="size-9 shrink-0 rounded-md overflow-hidden bg-muted/40 flex items-center justify-center border">
                                                                                        {isThumbnailable ? (
                                                                                            <img src={thumbnailUrl} alt={item.name} className="size-full object-contain" loading="lazy" />
                                                                                        ) : (
                                                                                            getFileIcon(item.information.type === 'FILE' ? item.information.mime : '', isFolder, "size-4 text-muted-foreground")
                                                                                        )}
                                                                                    </div>
                                                                                    <span className="text-sm font-medium truncate flex-1 text-card-foreground" title={item.name}>{item.name}</span>
                                                                                    <span className="text-xs text-muted-foreground w-20 text-right">
                                                                                        {isFolder ? '-' : formatBytes(item.information.type === 'FILE' ? item.information.sizeInBytes : 0)}
                                                                                    </span>
                                                                                    {/* Mobile tap indicator for folders in list view */}
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
                                                                                <ContextMenuItem onClick={async () => {
                                                                                    await callAPI('restore', { method: 'POST', query: { id: item.id } });
                                                                                    await refreshItems();
                                                                                }}>
                                                                                    <RotateCcw className="mr-2 size-4" /> Restore
                                                                                </ContextMenuItem>
                                                                                <ContextMenuSeparator />
                                                                                <ContextMenuItem className="text-destructive focus:text-destructive" onClick={() => {
                                                                                    setItemToDelete(item);
                                                                                    setDialogs(prev => ({ ...prev, delete: true }));
                                                                                }}>
                                                                                    <Trash2 className="mr-2 size-4" /> Delete Forever
                                                                                </ContextMenuItem>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <ContextMenuItem onClick={() => setDetailsItem(item)}>
                                                                                    <Info className="mr-2 size-4" /> Details
                                                                                </ContextMenuItem>
                                                                                <ContextMenuItem onClick={() => {
                                                                                    setRenameItem(item);
                                                                                    setDialogs(prev => ({ ...prev, rename: true }));
                                                                                }}>
                                                                                    <Pencil className="mr-2 size-4" /> Rename
                                                                                </ContextMenuItem>
                                                                                <ContextMenuSeparator />
                                                                                <ContextMenuItem className="text-destructive focus:text-destructive" onClick={() => {
                                                                                    setItemToDelete(item);
                                                                                    setDialogs(prev => ({ ...prev, delete: true }));
                                                                                }}>
                                                                                    <Trash2 className="mr-2 size-4" /> Delete
                                                                                </ContextMenuItem>
                                                                            </>
                                                                        )}
                                                                    </ContextMenuContent>
                                                                </ContextMenu>
                                                            </SortableItem>
                                                        );
                                                    })}
                                                </div>
                                            </SortableContext>
                                        </div>
                                    ))}
                                </div>
                                {/* Infinite Scroll Sentinel */}
                                {hasMore && (
                                    <div ref={observerTarget} className="flex justify-center py-4">
                                        {isLoadingMore && <Loader2 className="size-6 animate-spin text-muted-foreground" />}
                                        {!isLoadingMore && <div className="h-4 w-full" />}
                                    </div>
                                )}

                                {/* Components */}
                                <DriveFileDetails
                                    item={detailsItem}
                                    isOpen={!!detailsItem}
                                    onClose={() => setDetailsItem(null)}
                                    apiEndpoint={apiEndpoint}
                                />

                                {/* Dialogs */}
                                <DialogConfirmation
                                    open={dialogs.newFolder}
                                    onClose={() => setDialogs(prev => ({ ...prev, newFolder: false }))}
                                    title="Create New Folder"
                                    description="Enter a name for the new folder"
                                    inputs={[{ type: 'INPUT', id: 'name', name: 'Folder name', required: true }] as const}
                                    onConfirm={async (inputs) => {
                                        try {
                                            await callAPI('createFolder', {
                                                method: 'POST',
                                                body: JSON.stringify({ name: inputs.name, parentId: currentFolderId || 'root' })
                                            });
                                            await refreshItems();
                                            return [true];
                                        } catch (error) {
                                            return [false, error instanceof Error ? error.message : 'Failed to create folder'];
                                        }
                                    }}
                                />

                                <DialogConfirmation
                                    open={dialogs.rename}
                                    onClose={() => {
                                        setDialogs(prev => ({ ...prev, rename: false }));
                                        setRenameItem(null);
                                    }}
                                    title={`Rename ${renameItem?.information.type === 'FOLDER' ? 'Folder' : 'File'}`}
                                    description="Enter a new name"
                                    inputs={[{ type: 'INPUT', id: 'name', name: 'Name', default: renameItem?.name, required: true }] as const}
                                    onConfirm={async (inputs) => {
                                        if (!renameItem) return [false, 'No item selected'];
                                        try {
                                            await callAPI('rename', {
                                                method: 'PATCH',
                                                query: { id: renameItem.id },
                                                body: JSON.stringify({ newName: inputs.name })
                                            });
                                            await refreshItems();
                                            setRenameItem(null);
                                            return [true];
                                        } catch (error) {
                                            return [false, error instanceof Error ? error.message : 'Failed to rename'];
                                        }
                                    }}
                                />

                                <DialogConfirmation
                                    open={dialogs.delete}
                                    onClose={() => {
                                        setDialogs(prev => ({ ...prev, delete: false }));
                                        setItemToDelete(null);
                                    }}
                                    title={currentView === 'TRASH' ? 'Delete Permanently?' : 'Move to Trash?'}
                                    description={
                                        currentView === 'TRASH'
                                            ? `This will permanently delete "${itemToDelete?.name}". You cannot undo this action.`
                                            : `Are you sure you want to move "${itemToDelete?.name}" to trash?`
                                    }
                                    onConfirm={async () => {
                                        if (!itemToDelete) return [false, 'No item selected'];
                                        try {
                                            await deleteItems([itemToDelete.id]);
                                            await refreshItems();
                                            setItemToDelete(null);
                                            return [true];
                                        } catch (error) {
                                            return [false, error instanceof Error ? error.message : 'Failed to delete'];
                                        }
                                    }}
                                />
                            </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                            {currentView === 'BROWSE' ? (
                                <ContextMenuItem onClick={() => setDialogs(prev => ({ ...prev, newFolder: true }))}>
                                    <FolderPlus className="mr-2 size-4" /> New Folder
                                </ContextMenuItem>
                            ) : (
                                <div className="px-2 py-6 text-center">
                                    <p className="text-xs text-muted-foreground">No actions available</p>
                                </div>
                            )}
                        </ContextMenuContent>
                    </ContextMenu>
                )}
            </div>
        </DndContext>
    );
};
