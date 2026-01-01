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
import { useDrive } from '@/client/context';
import { cn } from '@/client/utils';

export const DriveHeader = () => {
    const {
        viewMode, setViewMode, groupBy, setGroupBy, sortBy, setSortBy,
        selectedFileIds, setItems, setSelectedFileIds,
        currentView, setCurrentView, searchQuery, setSearchQuery,
        searchScope, setSearchScope, deleteItem, restoreItem, callAPI, createFolder
    } = useDrive();

    // Localization removed as per user request
    const [dialogs, setDialogs] = useState({ delete: false, emptyTrash: false, newFolder: false });

    return (
        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 dark:bg-muted/20 p-2">
            {/* New Folder Button - Only in BROWSE view */}
            {currentView === 'BROWSE' && (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setDialogs(prev => ({ ...prev, newFolder: true }))}
                >
                    <FolderPlus className="size-4" />
                    <span className="hidden sm:inline">New Folder</span>
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
                            className="gap-1.5"
                        >
                            <Menu className="size-4" />
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
                                <RotateCcw className="size-3.5 mr-2" />
                                Restore ({selectedFileIds.length})
                            </DropdownMenuItem>
                        )}

                        {/* Delete (Contextual) */}
                        {selectedFileIds.length > 0 && (
                            <DropdownMenuItem
                                onClick={() => setDialogs(prev => ({ ...prev, delete: true }))}
                                className="text-destructive focus:text-destructive"
                            >
                                <Trash2 className="size-3.5 mr-2" />
                                {currentView === 'TRASH' ? 'Delete Forever' : 'Delete'} ({selectedFileIds.length})
                            </DropdownMenuItem>
                        )}

                        {/* Empty Trash (Contextual) */}
                        {currentView === 'TRASH' && selectedFileIds.length === 0 && (
                            <DropdownMenuItem
                                onClick={() => setDialogs(prev => ({ ...prev, emptyTrash: true }))}
                                className="text-destructive focus:text-destructive"
                            >
                                <Trash2 className="size-3.5 mr-2" />
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
                        className="gap-1.5"
                    >
                        <Group className="size-3.5" />
                        <span className="hidden sm:inline">
                            {groupBy === "NONE" ? 'Group' : 'Grouped'}
                        </span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => setGroupBy("NONE")}>
                        {groupBy === "NONE" && <Check className="size-3.5 mr-2" />}
                        <span className={cn(groupBy !== "NONE" && "pl-5.5")}>
                            No Grouping
                        </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setGroupBy("CREATED_AT")}>
                        {groupBy === "CREATED_AT" && <Check className="size-3.5 mr-2" />}
                        <span className={cn(groupBy !== "CREATED_AT" && "pl-5.5")}>
                            Created Date
                        </span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Search */}
            <div className="flex-1 min-w-0 sm:min-w-50 relative">
                <Input
                    type="text"
                    placeholder="Search files..."
                    className="w-full pl-8 pr-7 h-9"
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
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                </div>
                {searchQuery && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
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
                    <Button type="button" variant="ghost" size="sm" className="gap-1.5">
                        <ArrowUpDown className="size-3.5" />
                        <span className="hidden sm:inline max-w-24 truncate">
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
                        {sortBy.field === "order" && <Check className="size-3.5 mr-2" />}
                        <span className={cn(sortBy.field !== "order" && "pl-5.5")}>Custom Order</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy({ field: "id", order: 1 })}>
                        {sortBy.field === "id" && <Check className="size-3.5 mr-2" />}
                        <span className={cn(sortBy.field !== "id" && "pl-5.5")}>Default</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSortBy({ field: "createdAt", order: -1 })}>
                        {sortBy.field === "createdAt" && sortBy.order === -1 && <Check className="size-3.5 mr-2" />}
                        <Calendar className={cn("size-3.5 mr-2", sortBy.field === "createdAt" && sortBy.order === -1 ? "" : "ml-5.5")} />
                        Date: Newest
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy({ field: "createdAt", order: 1 })}>
                        {sortBy.field === "createdAt" && sortBy.order === 1 && <Check className="size-3.5 mr-2" />}
                        <Calendar className={cn("size-3.5 mr-2", sortBy.field === "createdAt" && sortBy.order === 1 ? "" : "ml-5.5")} />
                        Date: Oldest
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSortBy({ field: "name", order: 1 })}>
                        {sortBy.field === "name" && sortBy.order === 1 && <Check className="size-3.5 mr-2" />}
                        <ArrowDownAZ className={cn("size-3.5 mr-2", sortBy.field === "name" && sortBy.order === 1 ? "" : "ml-5.5")} />
                        Name: A to Z
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy({ field: "name", order: -1 })}>
                        {sortBy.field === "name" && sortBy.order === -1 && <Check className="size-3.5 mr-2" />}
                        <ArrowUpAZ className={cn("size-3.5 mr-2", sortBy.field === "name" && sortBy.order === -1 ? "" : "ml-5.5")} />
                        Name: Z to A
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSortBy({ field: "size", order: -1 })}>
                        {sortBy.field === "size" && sortBy.order === -1 && <Check className="size-3.5 mr-2" />}
                        <ArrowDown01 className={cn("size-3.5 mr-2", sortBy.field === "size" && sortBy.order === -1 ? "" : "ml-5.5")} />
                        Size: Large
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy({ field: "size", order: 1 })}>
                        {sortBy.field === "size" && sortBy.order === 1 && <Check className="size-3.5 mr-2" />}
                        <ArrowUp01 className={cn("size-3.5 mr-2", sortBy.field === "size" && sortBy.order === 1 ? "" : "ml-5.5")} />
                        Size: Small
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <div className="w-px h-5 bg-border" />

            {/* View Toggles */}
            <div className="flex bg-muted/50 dark:bg-muted/30 rounded-md p-0.5 gap-0.5">
                <Button
                    type="button"
                    variant={"ghost"}
                    size="icon"
                    className={cn(
                        "h-8 w-8",
                        viewMode === "GRID" && "bg-background shadow-sm hover:bg-background dark:bg-background/80"
                    )}
                    onClick={() => setViewMode("GRID")}
                    aria-label="Grid View"
                    aria-pressed={viewMode === "GRID"}
                >
                    <LayoutGrid className="size-4" />
                </Button>
                <Button
                    type="button"
                    variant={"ghost"}
                    size="icon"
                    className={cn(
                        "h-8 w-8",
                        viewMode === "LIST" && "bg-background shadow-sm hover:bg-background dark:bg-background/80"
                    )}
                    onClick={() => setViewMode("LIST")}
                    aria-label="List View"
                    aria-pressed={viewMode === "LIST"}
                >
                    <List className="size-4" />
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
            <DialogConfirmation
                open={dialogs.newFolder}
                onClose={() => setDialogs(prev => ({ ...prev, newFolder: false }))}
                title="Create New Folder"
                description="Enter a name for the new folder"
                inputs={[{ type: 'INPUT', id: 'name', name: 'Folder name', required: true }] as const}
                onConfirm={async (inputs) => {
                    await createFolder(inputs.name);
                    return [true];
                }}
            />
        </div>
    );
};
