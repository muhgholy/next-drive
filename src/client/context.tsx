// ** Client Context
'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import type { TDatabaseDrive, TDriveAPIResponse } from '@/types/server';
import type { TDrivePathItem, TDriveQuota, TDriveFile, TImageQuality, TImageFormat } from '@/types/client';
import { driveCreateUrl, driveCreateSrcSet } from '@/client/utils';

// ** Context Types
export type TDriveContext = {
    apiEndpoint: string;
    currentFolderId: string | null;
    path: TDrivePathItem[];
    items: TDatabaseDrive[];
    allItems: Record<string, TDatabaseDrive[]>;
    isLoading: boolean;
    error: string | null;
    quota: TDriveQuota | null;

    // ** Accounts
    accounts: { id: string; name: string; email: string; provider: 'GOOGLE' }[];
    activeAccountId: string | null;
    setActiveAccountId: (id: string | null) => void;
    refreshAccounts: () => Promise<void>;

    // ** UI State
    viewMode: 'GRID' | 'LIST';
    setViewMode: (mode: 'GRID' | 'LIST') => void;
    currentView: 'BROWSE' | 'TRASH' | 'SEARCH';
    setCurrentView: (view: 'BROWSE' | 'TRASH' | 'SEARCH') => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    searchScope: 'ACTIVE' | 'TRASH';
    setSearchScope: (scope: 'ACTIVE' | 'TRASH') => void;
    groupBy: 'NONE' | 'CREATED_AT';
    setGroupBy: (group: 'NONE' | 'CREATED_AT') => void;
    sortBy: { field: string; order: number };
    setSortBy: (sort: { field: string; order: number }) => void;

    // ** Selection
    selectionMode: { type: 'SINGLE' } | { type: 'MULTIPLE'; maxFile?: number };
    selectedFileIds: string[];
    setSelectedFileIds: React.Dispatch<React.SetStateAction<string[]>>;

    // ** Utilities
    createUrl: (driveFile: TDriveFile, options?: { quality?: TImageQuality; format?: TImageFormat }) => string;
    createSrcSet: (driveFile: TDriveFile, format?: TImageFormat) => { srcSet: string; sizes: string };

    // ** Actions
    navigateToFolder: (item: { id: string | null; name: string } | null) => void;
    navigateUp: () => void;
    refreshItems: () => Promise<void>;
    refreshQuota: () => Promise<void>;
    moveItem: (itemId: string, targetFolderId: string) => Promise<void>;
    deleteItems: (ids: string[]) => Promise<void>;
    callAPI: <T>(action: string, options?: RequestInit & { query?: Record<string, string> }) => Promise<TDriveAPIResponse<T>>;
    setItems: (updater: React.SetStateAction<TDatabaseDrive[]>) => void; // Kept signature but implements differently
    setAllItems: React.Dispatch<React.SetStateAction<Record<string, TDatabaseDrive[]>>>;

    // ** Pagination
    loadMore: () => Promise<void>;
    hasMore: boolean;
    isLoadingMore: boolean;
};

const DriveContext = createContext<TDriveContext | null>(null);

// ** Drive Provider Component
export const DriveProvider = (props: Readonly<{
    children: ReactNode;
    apiEndpoint: string;
    initialActiveAccountId?: string | null;
    initialSelectionMode?: { type: 'SINGLE' } | { type: 'MULTIPLE'; maxFile?: number };
    defaultSelectedFileIds?: string[];
}>) => {
    const { children, apiEndpoint, initialActiveAccountId = null, initialSelectionMode = { type: 'SINGLE' }, defaultSelectedFileIds = [] } = props;

    // ** Account State
    const [accounts, setAccounts] = useState<{ id: string; name: string; email: string; provider: 'GOOGLE' }[]>([]);
    const [activeAccountId, setActiveAccountIdState] = useState<string | null>(initialActiveAccountId);

    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [path, setPath] = useState<TDrivePathItem[]>([{ id: null, name: 'Home' }]);

    // ** Cache: Key = AccountID ('LOCAL' for null), Value = Items
    const [allItems, setAllItems] = useState<Record<string, TDatabaseDrive[]>>({});

    const [searchResults, setSearchResults] = useState<TDatabaseDrive[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [quota, setQuota] = useState<TDriveQuota | null>(null);

    const activeCacheKey = activeAccountId || 'LOCAL';

    const setActiveAccountId = useCallback((id: string | null) => {
        setActiveAccountIdState(id);
        if (id) localStorage.setItem('drive_active_account', id);
        else localStorage.removeItem('drive_active_account');
        // Reset path when switching accounts
        setCurrentFolderId(null);
        setPath([{ id: null, name: 'Home' }]);
        setSearchResults([]);
    }, []);

    // Load active account from local storage on mount
    React.useEffect(() => {
        const stored = localStorage.getItem('drive_active_account');
        if (stored) setActiveAccountIdState(stored);
    }, []);

    // ** UI State
    const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
    const [currentView, setCurrentView] = useState<'BROWSE' | 'TRASH' | 'SEARCH'>('BROWSE');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchScope, setSearchScope] = useState<'ACTIVE' | 'TRASH'>('ACTIVE');
    const [groupBy, setGroupBy] = useState<'NONE' | 'CREATED_AT'>('NONE');
    const [sortBy, setSortBy] = useState<{ field: string; order: number }>({ field: 'createdAt', order: -1 });

    // ** Derived items for current folder (from cache)
    const items = useMemo(() => {
        const currentItems = allItems[activeCacheKey] || [];

        if (currentView === 'TRASH') return currentItems.filter(i => i.trashedAt !== null);
        if (currentView === 'SEARCH') return searchResults;
        return currentItems.filter(i => i.parentId === currentFolderId && !i.trashedAt);
    }, [allItems, activeCacheKey, currentFolderId, currentView, searchResults]);

    // ** Setter for backward compatibility (Updates ONLY current account cache)
    const setItems = useCallback((updater: React.SetStateAction<TDatabaseDrive[]>) => {
        setAllItems(prev => {
            const currentCache = prev[activeCacheKey] || [];

            let newItems: TDatabaseDrive[];
            if (typeof updater === 'function') {
                // Filter current view items for updater
                const viewItems = currentCache.filter(i => i.parentId === currentFolderId && !i.trashedAt);
                const updatedViewItems = updater(viewItems);
                // Merge back: Keep items NOT in current view, add updated view items
                newItems = [...currentCache.filter(i => i.parentId !== currentFolderId || i.trashedAt), ...updatedViewItems];
            } else {
                newItems = [...currentCache.filter(i => i.parentId !== currentFolderId || i.trashedAt), ...updater];
            }

            return { ...prev, [activeCacheKey]: newItems };
        });
    }, [activeCacheKey, currentFolderId]);

    // ** Selection
    const [selectionMode] = useState(initialSelectionMode);
    const [selectedFileIds, setSelectedFileIds] = useState<string[]>(defaultSelectedFileIds);

    // ** Pagination
    const [hasMore, setHasMore] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // ** API Helper
    const callAPI = useCallback(async <T,>(action: string, options?: RequestInit & { query?: Record<string, string> }): Promise<TDriveAPIResponse<T>> => {
        const { query, ...fetchOptions } = options || {};
        const params = new URLSearchParams({ action, ...query });
        const url = `${apiEndpoint}?${params.toString()}`;

        const headers: Record<string, string> = { 'Content-Type': 'application/json', ...((fetchOptions?.headers as Record<string, string>) || {}) };
        if (activeAccountId) headers['x-drive-account'] = activeAccountId;

        try {
            const response = await fetch(url, { ...fetchOptions, headers });
            return await response.json();
        } catch (err) {
            return { status: 0, message: err instanceof Error ? err.message : 'Network error' };
        }
    }, [apiEndpoint, activeAccountId]);

    // ** Fetch Items (Initial)
    const refreshItems = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setHasMore(false); // Reset

        let response: TDriveAPIResponse<{ items: TDatabaseDrive[]; hasMore?: boolean }>;

        if (currentView === 'TRASH') {
            response = await callAPI('trash');
        } else if (currentView === 'SEARCH' && searchQuery) {
            response = await callAPI('search', { query: { q: searchQuery, limit: '50', trashed: searchScope === 'TRASH' ? 'true' : 'false' } });
        } else {
            response = await callAPI('list', { query: { folderId: currentFolderId || 'root', limit: '50' } });
        }

        if (response.status === 200 && response.data) {
            if (currentView === 'SEARCH') {
                // For SEARCH, set results separately (don't pollute cache)
                setSearchResults(response.data.items);
            } else {
                // For BROWSE/TRASH, merge into allItems cache (avoid duplicates by id)
                setAllItems(prev => {
                    const currentCache = prev[activeCacheKey] || [];
                    const existingIds = new Set(response.data!.items.map(i => i.id));
                    const filtered = currentCache.filter(i => !existingIds.has(i.id));

                    return {
                        ...prev,
                        [activeCacheKey]: [...filtered, ...response.data!.items]
                    };
                });
            }
            setHasMore(!!response.data.hasMore);
        } else {
            setError(response.message || 'Failed to load items');
        }
        setIsLoading(false);
    }, [callAPI, currentFolderId, currentView, searchQuery, searchScope, activeCacheKey]);

    // ** Fetch Accounts
    const refreshAccounts = useCallback(async () => {
        const response = await callAPI<{ accounts: { id: string; name: string; email: string; provider: 'GOOGLE' }[] }>('listAccounts');
        if (response.status === 200 && response.data) {
            setAccounts(response.data.accounts);
        }
    }, [callAPI]);

    // ** Load More
    const loadMore = useCallback(async () => {
        if (!hasMore || isLoading || isLoadingMore || currentView === 'TRASH') return;
        setIsLoadingMore(true);

        const currentItems = items; // derived items
        const lastItem = currentItems[currentItems.length - 1];
        const afterId = lastItem ? lastItem.id : undefined;

        if (!afterId) { setIsLoadingMore(false); return; }

        let response: TDriveAPIResponse<{ items: TDatabaseDrive[]; hasMore?: boolean }>;

        if (currentView === 'SEARCH' && searchQuery) {
            setIsLoadingMore(false); return;
        } else {
            response = await callAPI('list', {
                query: { folderId: currentFolderId || 'root', limit: '50', afterId }
            });
        }

        if (response && response.status === 200 && response.data) {
            // Append to current cache
            setAllItems(prev => {
                const currentCache = prev[activeCacheKey] || [];
                return {
                    ...prev,
                    [activeCacheKey]: [...currentCache, ...response.data!.items]
                };
            });
            setHasMore(!!response.data.hasMore);
        }
        setIsLoadingMore(false);
    }, [callAPI, currentFolderId, hasMore, isLoading, isLoadingMore, items, currentView, searchQuery, activeCacheKey]);

    // ** Fetch Quota
    const refreshQuota = useCallback(async () => {
        const response = await callAPI<TDriveQuota>('quota');
        if (response.status === 200 && response.data) setQuota(response.data);
    }, [callAPI]);

    // ** Navigation
    const navigateToFolder = useCallback((item: { id: string | null; name: string } | null) => {
        // Always switch to BROWSE view when navigating
        setCurrentView('BROWSE');
        setSearchQuery('');

        if (item === null) {
            setCurrentFolderId(null);
            setPath([{ id: null, name: 'Home' }]);
            setSelectedFileIds([]);
            return;
        }
        setCurrentFolderId(item.id);
        setPath((prev) => {
            const existingIndex = prev.findIndex(p => p.id === item.id);
            if (existingIndex !== -1) {
                return prev.slice(0, existingIndex + 1);
            }
            return [...prev, { id: item.id, name: item.name }];
        });
        setSelectedFileIds([]);
    }, []);

    const navigateUp = useCallback(() => {
        // Always switch to BROWSE view when navigating
        setCurrentView('BROWSE');
        setSearchQuery('');

        if (path.length <= 1) return;
        const newPath = path.slice(0, -1);
        setPath(newPath);
        setCurrentFolderId(newPath[newPath.length - 1]?.id || null);
        setSelectedFileIds([]);
    }, [path]);

    // ** Move Item (optimistic update + API call)
    const moveItem = useCallback(async (itemId: string, targetFolderId: string) => {
        // Optimistic update
        setAllItems(prev => {
            const currentCache = prev[activeCacheKey] || [];
            const newItems = currentCache.map(item =>
                item.id === itemId
                    ? { ...item, parentId: targetFolderId === 'root' ? null : targetFolderId }
                    : item
            );
            return { ...prev, [activeCacheKey]: newItems };
        });

        // Call API
        await callAPI('move', {
            method: 'POST',
            body: JSON.stringify({ ids: [itemId], targetFolderId })
        });
    }, [callAPI, activeCacheKey]);

    // ** Delete Items (optimistic update + API call)
    const deleteItems = useCallback(async (ids: string[]) => {
        // Optimistic update
        setAllItems(prev => {
            const currentCache = prev[activeCacheKey] || [];
            let newItems: TDatabaseDrive[];

            if (currentView === 'TRASH') {
                // If in trash (permanent delete), remove completely
                newItems = currentCache.filter(item => !ids.includes(item.id));
            } else {
                // If browsing (soft delete), mark as trashed locally or remove from view
                // For simplicity, we just mark trashedAt so our view filter catches it
                newItems = currentCache.map(item =>
                    ids.includes(item.id)
                        ? { ...item, trashedAt: new Date() } // Use Date object
                        : item
                );
            }
            return { ...prev, [activeCacheKey]: newItems };
        });

        // Clear selection
        setSelectedFileIds([]);

        // Call API
        if (currentView === 'TRASH') {
            for (const id of ids) {
                await callAPI('deletePermanent', { query: { id } });
            }
        } else {
            for (const id of ids) {
                await callAPI('delete', { query: { id } });
            }
        }

    }, [callAPI, activeCacheKey, currentView]);

    // ** Effects
    React.useEffect(() => { refreshItems(); }, [currentFolderId, currentView, refreshItems, activeAccountId]); // Reload when account changes
    React.useEffect(() => { refreshQuota(); }, [refreshQuota, activeAccountId]);
    React.useEffect(() => { refreshAccounts(); }, [refreshAccounts]);

    // ** Utility methods
    const createUrl = useCallback((driveFile: TDriveFile, options?: { quality?: TImageQuality; format?: TImageFormat }) => {
        return driveCreateUrl(driveFile, apiEndpoint, options);
    }, [apiEndpoint]);

    const createSrcSet = useCallback((driveFile: TDriveFile, format?: TImageFormat) => {
        return driveCreateSrcSet(driveFile, apiEndpoint, format);
    }, [apiEndpoint]);

    return (
        <DriveContext.Provider value={{
            apiEndpoint, currentFolderId, path, items, allItems, setItems, setAllItems, isLoading, error, quota, refreshQuota,
            accounts, activeAccountId, setActiveAccountId, refreshAccounts,
            viewMode, setViewMode, groupBy, setGroupBy, sortBy, setSortBy,
            currentView, setCurrentView, searchQuery, setSearchQuery, searchScope, setSearchScope,
            selectionMode, selectedFileIds, setSelectedFileIds,
            createUrl, createSrcSet,
            navigateToFolder, navigateUp, refreshItems, callAPI, moveItem, deleteItems,
            loadMore, hasMore, isLoadingMore
        }}>
            {children}
        </DriveContext.Provider>
    );
};

// ** Hook
export const useDrive = (): TDriveContext => {
    const context = useContext(DriveContext);
    if (!context) throw new Error('useDrive must be used within a DriveProvider');
    return context;
};

