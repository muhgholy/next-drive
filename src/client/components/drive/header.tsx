// ** Drive Header
'use client';

import React, { useState } from 'react';
import {
    Trash2, ArrowUpDown, LayoutGrid, List, Group, Calendar,
    ArrowDownAZ, ArrowUpAZ, ArrowDown01, ArrowUp01, Check, RotateCcw, Menu, FolderPlus
} from 'lucide-react';
import { Button } from '@/client/components/ui/button';
import { Input } from '@/client/components/ui/input';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger
} from '@/client/components/ui/dropdown-menu';
import { DialogConfirmation } from '@/client/components/dialog';
import { CreateFolderDialog } from '@/client/components/drive/CreateFolderDialog';
import { useDrive } from '@/client/context';
import { cn } from '@/client/utils';

export const DriveHeader = ({ className }: { className?: string }) => {
    const {
        viewMode, setViewMode, groupBy, setGroupBy, sortBy, setSortBy,
        selectedFileIds, setItems, setSelectedFileIds,
        currentView, setCurrentView, searchQuery, setSearchQuery,
        searchScope, setSearchScope, deleteItem, restoreItem, callAPI, createFolder
    } = useDrive();

    const [dialogs, setDialogs] = useState({ delete: false, emptyTrash: false, newFolder: false });

    return (
        <div className={cn("nd-flex nd-flex-wrap nd-items-center nd-gap-2 nd-bg-muted/30 dark:nd-bg-muted/20 nd-p-2", className)}>
            {/* New Folder Button - Only in BROWSE view */}
            {currentView === 'BROWSE' && (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="nd-gap-1.5"
                    onClick={() => setDialogs(prev => ({ ...prev, newFolder: true }))}
                >
                    <FolderPlus className="nd-size-4" />
                    <span className="nd-hidden sm:nd-inline">New Folder</span>
                </Button>
            )}

            {/* Actions Dropdown - Only show if there are actions available */}
            {(selectedFileIds.length > 0 || currentView === 'TRASH') && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="nd-gap-1.5"
                        >
                            <Menu className="nd-size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        {/* Restore (Contextual) */}
                        {selectedFileIds.length > 0 && currentView === 'TRASH' && (
                            <DropdownMenuItem
                                onClick={async () => {
                                    for (const id of selectedFileIds) {
                                        await restoreItem(id);
                                    }
                                    setSelectedFileIds([]);
                                }}
                            >
                                <RotateCcw className="nd-size-3.5 nd-mr-2" />
                                Restore ({selectedFileIds.length})
                            </DropdownMenuItem>
                        )}

                        {/* Delete (Contextual) */}
                        {selectedFileIds.length > 0 && (
                            <DropdownMenuItem
                                onClick={() => setDialogs(prev => ({ ...prev, delete: true }))}
                                className="nd-text-destructive focus:nd-text-destructive"
                            >
                                <Trash2 className="nd-size-3.5 nd-mr-2" />
                                {currentView === 'TRASH' ? 'Delete Forever' : 'Delete'} ({selectedFileIds.length})
                            </DropdownMenuItem>
                        )}

                        {/* Empty Trash (Contextual) */}
                        {currentView === 'TRASH' && selectedFileIds.length === 0 && (
                            <DropdownMenuItem
                                onClick={() => setDialogs(prev => ({ ...prev, emptyTrash: true }))}
                                className="nd-text-destructive focus:nd-text-destructive"
                            >
                                <Trash2 className="nd-size-3.5 nd-mr-2" />
                                Empty Trash
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}

            {/* Group By Dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        type="button"
                        variant={groupBy !== "NONE" ? "secondary" : "ghost"}
                        size="sm"
                        className="nd-gap-1.5"
                    >
                        <Group className="nd-size-3.5" />
                        <span className="nd-hidden sm:nd-inline">
                            {groupBy === "NONE" ? 'Group' : 'Grouped'}
                        </span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => setGroupBy("NONE")}>
                        {groupBy === "NONE" && <Check className="nd-size-3.5 nd-mr-2" />}
                        <span className={cn(groupBy !== "NONE" && "nd-pl-5.5")}>
                            No Grouping
                        </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setGroupBy("CREATED_AT")}>
                        {groupBy === "CREATED_AT" && <Check className="nd-size-3.5 nd-mr-2" />}
                        <span className={cn(groupBy !== "CREATED_AT" && "nd-pl-5.5")}>
                            Created Date
                        </span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Search */}
            <div className="nd-flex-1 nd-min-w-0 sm:nd-min-w-50 nd-relative">
                <Input
                    type="text"
                    placeholder="Search files..."
                    className="nd-w-full nd-pl-8 nd-pr-7 nd-h-9"
                    value={searchQuery}
                    onChange={(e) => {
                        const val = e.target.value;
                        setSearchQuery(val);
                        if (val.trim().length > 0) {
                            if (currentView !== 'SEARCH') {
                                setSearchScope(currentView === 'TRASH' ? 'TRASH' : 'ACTIVE');
                            }
                            setCurrentView('SEARCH');
                        } else if (currentView === 'SEARCH') {
                            setCurrentView(searchScope === 'TRASH' ? 'TRASH' : 'BROWSE');
                        }
                    }}
                />
                <div className="nd-absolute nd-left-2.5 nd-top-1/2 -nd-translate-y-1/2 nd-text-muted-foreground nd-pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                </div>
                {searchQuery && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="nd-absolute nd-right-0.5 nd-top-1/2 -nd-translate-y-1/2 nd-h-7 nd-w-7 nd-text-muted-foreground"
                        onClick={() => {
                            setSearchQuery('');
                            setCurrentView(searchScope === 'TRASH' ? 'TRASH' : 'BROWSE');
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </Button>
                )}
            </div>

            {/* Sort Dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="nd-gap-1.5">
                        <ArrowUpDown className="nd-size-3.5" />
                        <span className="nd-hidden sm:nd-inline nd-max-w-24 nd-truncate">
                            {sortBy.field === "id" ? 'Default' :
                                sortBy.field === "order" ? 'Custom' :
                                    sortBy.field === "createdAt" ? (sortBy.order === -1 ? 'Date: Newest' : 'Date: Oldest') :
                                        sortBy.field === "name" ? (sortBy.order === 1 ? 'Name: A to Z' : 'Name: Z to A') :
                                            sortBy.field === "size" ? (sortBy.order === -1 ? 'Size: Large' : 'Size: Small') :
                                                'Sort'}
                        </span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSortBy({ field: "order", order: 1 })}>
                        {sortBy.field === "order" && <Check className="nd-size-3.5 nd-mr-2" />}
                        <span className={cn(sortBy.field !== "order" && "nd-pl-5.5")}>Custom Order</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy({ field: "id", order: 1 })}>
                        {sortBy.field === "id" && <Check className="nd-size-3.5 nd-mr-2" />}
                        <span className={cn(sortBy.field !== "id" && "nd-pl-5.5")}>Default</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSortBy({ field: "createdAt", order: -1 })}>
                        {sortBy.field === "createdAt" && sortBy.order === -1 && <Check className="nd-size-3.5 nd-mr-2" />}
                        <Calendar className={cn("nd-size-3.5 nd-mr-2", sortBy.field === "createdAt" && sortBy.order === -1 ? "" : "nd-ml-5.5")} />
                        Date: Newest
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy({ field: "createdAt", order: 1 })}>
                        {sortBy.field === "createdAt" && sortBy.order === 1 && <Check className="nd-size-3.5 nd-mr-2" />}
                        <Calendar className={cn("nd-size-3.5 nd-mr-2", sortBy.field === "createdAt" && sortBy.order === 1 ? "" : "nd-ml-5.5")} />
                        Date: Oldest
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSortBy({ field: "name", order: 1 })}>
                        {sortBy.field === "name" && sortBy.order === 1 && <Check className="nd-size-3.5 nd-mr-2" />}
                        <ArrowDownAZ className={cn("nd-size-3.5 nd-mr-2", sortBy.field === "name" && sortBy.order === 1 ? "" : "nd-ml-5.5")} />
                        Name: A to Z
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy({ field: "name", order: -1 })}>
                        {sortBy.field === "name" && sortBy.order === -1 && <Check className="nd-size-3.5 nd-mr-2" />}
                        <ArrowUpAZ className={cn("nd-size-3.5 nd-mr-2", sortBy.field === "name" && sortBy.order === -1 ? "" : "nd-ml-5.5")} />
                        Name: Z to A
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSortBy({ field: "size", order: -1 })}>
                        {sortBy.field === "size" && sortBy.order === -1 && <Check className="nd-size-3.5 nd-mr-2" />}
                        <ArrowDown01 className={cn("nd-size-3.5 nd-mr-2", sortBy.field === "size" && sortBy.order === -1 ? "" : "nd-ml-5.5")} />
                        Size: Large
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy({ field: "size", order: 1 })}>
                        {sortBy.field === "size" && sortBy.order === 1 && <Check className="nd-size-3.5 nd-mr-2" />}
                        <ArrowUp01 className={cn("nd-size-3.5 nd-mr-2", sortBy.field === "size" && sortBy.order === 1 ? "" : "nd-ml-5.5")} />
                        Size: Small
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <div className="nd-w-px nd-h-5 nd-bg-border" />

            {/* View Toggles */}
            <div className="nd-flex nd-bg-muted/50 dark:nd-bg-muted/30 nd-rounded-md nd-p-0.5 nd-gap-0.5">
                <Button
                    type="button"
                    variant={"ghost"}
                    size="icon"
                    className={cn(
                        "nd-h-8 nd-w-8",
                        viewMode === "GRID" && "nd-bg-background nd-shadow-sm hover:nd-bg-background dark:nd-bg-background/80"
                    )}
                    onClick={() => setViewMode("GRID")}
                    aria-label="Grid View"
                    aria-pressed={viewMode === "GRID"}
                >
                    <LayoutGrid className="nd-size-4" />
                </Button>
                <Button
                    type="button"
                    variant={"ghost"}
                    size="icon"
                    className={cn(
                        "nd-h-8 nd-w-8",
                        viewMode === "LIST" && "nd-bg-background nd-shadow-sm hover:nd-bg-background dark:nd-bg-background/80"
                    )}
                    onClick={() => setViewMode("LIST")}
                    aria-label="List View"
                    aria-pressed={viewMode === "LIST"}
                >
                    <List className="nd-size-4" />
                </Button>
            </div>

            {/* Delete Confirmation Dialog */}
            <DialogConfirmation
                open={dialogs.delete}
                onClose={() => setDialogs(prev => ({ ...prev, delete: false }))}
                title={currentView === 'TRASH' ? 'Delete Permanently?' : 'Move to Trash?'}
                description={
                    currentView === 'TRASH'
                        ? `This will permanently delete ${selectedFileIds.length} item(s). You cannot undo this action.`
                        : `Are you sure you want to move ${selectedFileIds.length} item(s) to trash?`
                }
                onConfirm={async () => {
                    if (selectedFileIds.length === 0) return [false, 'No files selected'];
                    for (const id of selectedFileIds) {
                        await deleteItem(id);
                    }
                    return [true];
                }}
            />

            {/* Empty Trash Confirmation Dialog */}
            <DialogConfirmation
                open={dialogs.emptyTrash}
                onClose={() => setDialogs(prev => ({ ...prev, emptyTrash: false }))}
                title="Empty Trash?"
                description="All items in the trash will be permanently deleted. This action cannot be undone."
                onConfirm={async () => {
                    await callAPI('emptyTrash', { method: 'POST' });
                    setItems([]);
                    return [true];
                }}
            />

            {/* New Folder Dialog */}
            <CreateFolderDialog
                open={dialogs.newFolder}
                onClose={() => setDialogs(prev => ({ ...prev, newFolder: false }))}
                onConfirm={async (name) => {
                    await createFolder(name);
                }}
            />
        </div>
    );
};

// ** Content Progress Bar - Shows loading state at top of content area
import { Progress } from '@/client/components/ui/progress';

export const DriveContentProgress = () => {
    const { isLoading } = useDrive();

    if (!isLoading) return null;

    return (
        <div className="nd-h-1 nd-w-full nd-shrink-0">
            <Progress
                indeterminate
                className="nd-h-full nd-rounded-none nd-bg-primary/10"
                indicatorClassName="nd-bg-primary"
            />
        </div>
    );
};
