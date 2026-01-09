// ** Client Context - Simplified & Optimistic
'use client';

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { TDatabaseDrive, TDriveAPIResponse } from '@/types/server';
import type { TDrivePathItem, TDriveQuota, TDriveFile, TImageQuality, TImageFormat } from '@/types/client';
import { driveCreateUrl, driveCreateSrcSet } from '@/client/utils';

// ** Context Types
export type TDriveContext = {
    apiEndpoint: string;
    withCredentials: boolean;

    // ** Navigation
    currentFolderId: string | null;
    path: TDrivePathItem[];
    navigateToFolder: (item: { id: string | null; name: string } | null) => void;
    navigateUp: () => void;

    // ** Items
    items: TDatabaseDrive[];
    setItems: React.Dispatch<React.SetStateAction<TDatabaseDrive[]>>;
    isLoading: boolean;
    error: string | null;
    fetchItems: () => Promise<void>;
    triggerFetch: () => void;

    // ** Accounts
    accounts: { id: string; name: string; email: string; provider: 'GOOGLE' }[];
    activeAccountId: string | null;
    setActiveAccountId: (id: string | null) => void;
    refreshAccounts: () => Promise<void>;
    availableProviders: { google: boolean };

    // ** Storage
    quota: TDriveQuota | null;
    refreshQuota: () => Promise<void>;

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

    // ** Pagination
    hasMore: boolean;
    isLoadingMore: boolean;
    loadMore: () => Promise<void>;

    // ** Utilities
    createUrl: (driveFile: TDriveFile, options?: { quality?: TImageQuality; format?: TImageFormat }) => string;
    createSrcSet: (driveFile: TDriveFile, format?: TImageFormat) => { srcSet: string; sizes: string };
    callAPI: <T>(action: string, options?: RequestInit & { query?: Record<string, string> }) => Promise<TDriveAPIResponse<T>>;

    // ** Actions (Optimistic)
    createFolder: (name: string) => Promise<void>;
    renameItem: (id: string, newName: string) => Promise<void>;
    deleteItem: (id: string) => Promise<void>;
    moveItem: (id: string, targetFolderId: string) => Promise<void>;
    restoreItem: (id: string) => Promise<void>;
};

const DriveContext = createContext<TDriveContext | null>(null);

// ** Provider
export const DriveProvider = (props: Readonly<{
    children: ReactNode;
    apiEndpoint: string;
    initialActiveAccountId?: string | null;
    initialSelectionMode?: { type: 'SINGLE' } | { type: 'MULTIPLE'; maxFile?: number };
    defaultSelectedFileIds?: string[];
    withCredentials?: boolean;
    lazyFetch?: boolean;
}>) => {
    const {
        children,
        apiEndpoint,
        initialActiveAccountId = null,
        initialSelectionMode = { type: 'SINGLE' },
        defaultSelectedFileIds = [],
        withCredentials = false,
        lazyFetch = false
    } = props;

    // Track if initial fetch has been triggered (for lazy mode)
    const [hasFetched, setHasFetched] = React.useState(!lazyFetch);

    // =========================================================================
    // STATE
    // =========================================================================

    // ** Items - Simple flat array for current view
    const [items, setItems] = useState<TDatabaseDrive[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ** Navigation
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [path, setPath] = useState<TDrivePathItem[]>([{ id: null, name: 'Home' }]);

    // ** Accounts
    const [accounts, setAccounts] = useState<{ id: string; name: string; email: string; provider: 'GOOGLE' }[]>([]);
    const [activeAccountId, setActiveAccountIdState] = useState<string | null>(initialActiveAccountId);
    const [availableProviders, setAvailableProviders] = useState<{ google: boolean }>({ google: false });

    // ** Storage
    const [quota, setQuota] = useState<TDriveQuota | null>(null);

    // ** UI State
    const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>(() => {
        if (typeof window !== 'undefined') return window.innerWidth < 768 ? 'LIST' : 'GRID';
        return 'GRID';
    });
    const [currentView, setCurrentView] = useState<'BROWSE' | 'TRASH' | 'SEARCH'>('BROWSE');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchScope, setSearchScope] = useState<'ACTIVE' | 'TRASH'>('ACTIVE');
    const [groupBy, setGroupBy] = useState<'NONE' | 'CREATED_AT'>('NONE');
    const [sortBy, setSortBy] = useState<{ field: string; order: number }>({ field: 'createdAt', order: -1 });

    // ** Selection
    const [selectionMode] = useState(initialSelectionMode);
    const [selectedFileIds, setSelectedFileIds] = useState<string[]>(defaultSelectedFileIds);

    // ** Pagination
    const [hasMore, setHasMore] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // =========================================================================
    // API HELPER
    // =========================================================================

    const callAPI = useCallback(async <T,>(
        action: string,
        options?: RequestInit & { query?: Record<string, string> }
    ): Promise<TDriveAPIResponse<T>> => {
        const { query, ...fetchOptions } = options || {};
        const params = new URLSearchParams({ action, ...query });
        const url = `${apiEndpoint}?${params.toString()}`;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...((fetchOptions?.headers as Record<string, string>) || {})
        };
        if (activeAccountId) headers['x-drive-account'] = activeAccountId;

        try {
            const res = await fetch(url, {
                ...fetchOptions,
                headers,
                credentials: withCredentials ? 'include' : 'same-origin',
            });
            return await res.json();
        } catch (err) {
            return { status: 0, message: err instanceof Error ? err.message : 'Network error' };
        }
    }, [apiEndpoint, activeAccountId, withCredentials]);

    // =========================================================================
    // FETCH FUNCTIONS
    // =========================================================================

    const fetchItems = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        let res: TDriveAPIResponse<{ items: TDatabaseDrive[]; hasMore?: boolean }>;

        if (currentView === 'TRASH') {
            res = await callAPI('trash');
        } else if (currentView === 'SEARCH' && searchQuery) {
            res = await callAPI('search', { query: { q: searchQuery, limit: '50' } });
        } else {
            res = await callAPI('list', { query: { folderId: currentFolderId || 'root', limit: '50' } });
        }

        if (res.status === 200 && res.data) {
            setItems(res.data.items);
            setHasMore(!!res.data.hasMore);
        } else {
            setError(res.message || 'Failed to load');
            setItems([]);
        }

        setIsLoading(false);
    }, [callAPI, currentFolderId, currentView, searchQuery]);

    const loadMore = useCallback(async () => {
        if (!hasMore || isLoading || isLoadingMore) return;

        const lastItem = items[items.length - 1];
        if (!lastItem) return;

        setIsLoadingMore(true);

        const res = await callAPI<{ items: TDatabaseDrive[]; hasMore?: boolean }>('list', {
            query: { folderId: currentFolderId || 'root', limit: '50', afterId: lastItem.id }
        });

        if (res.status === 200 && res.data) {
            setItems(prev => [...prev, ...res.data!.items]);
            setHasMore(!!res.data.hasMore);
        }

        setIsLoadingMore(false);
    }, [callAPI, currentFolderId, hasMore, isLoading, isLoadingMore, items]);

    const refreshAccounts = useCallback(async () => {
        const res = await callAPI<{ accounts: typeof accounts }>('listAccounts');
        if (res.status === 200 && res.data) setAccounts(res.data.accounts);

        // Also fetch available providers
        const infoRes = await callAPI<{ providers: { google: boolean } }>('information');
        if (infoRes.status === 200 && infoRes.data) setAvailableProviders(infoRes.data.providers);
    }, [callAPI]);

    const refreshQuota = useCallback(async () => {
        const res = await callAPI<TDriveQuota>('quota');
        if (res.status === 200 && res.data) setQuota(res.data);
    }, [callAPI]);

    // =========================================================================
    // NAVIGATION
    // =========================================================================

    const setActiveAccountId = useCallback((id: string | null) => {
        setActiveAccountIdState(id);
        if (id) localStorage.setItem('drive_active_account', id);
        else localStorage.removeItem('drive_active_account');
        // Reset state
        setCurrentFolderId(null);
        setPath([{ id: null, name: 'Home' }]);
        setItems([]);
        setSelectedFileIds([]);
    }, []);

    const navigateToFolder = useCallback((item: { id: string | null; name: string } | null) => {
        setCurrentView('BROWSE');
        setSearchQuery('');
        setSelectedFileIds([]);
        setIsLoading(true); // Show loading immediately when navigating

        if (!item) {
            setCurrentFolderId(null);
            setPath([{ id: null, name: 'Home' }]);
            return;
        }

        setCurrentFolderId(item.id);
        setPath(prev => {
            const idx = prev.findIndex(p => p.id === item.id);
            return idx !== -1 ? prev.slice(0, idx + 1) : [...prev, { id: item.id, name: item.name }];
        });
    }, []);

    const navigateUp = useCallback(() => {
        if (path.length <= 1) return;
        setCurrentView('BROWSE');
        setSearchQuery('');
        setSelectedFileIds([]);
        setIsLoading(true); // Show loading immediately when navigating
        const newPath = path.slice(0, -1);
        setPath(newPath);
        setCurrentFolderId(newPath[newPath.length - 1]?.id || null);
    }, [path]);

    // =========================================================================
    // OPTIMISTIC ACTIONS
    // =========================================================================

    const createFolder = useCallback(async (name: string) => {
        // Optimistic: Add temp folder
        const tempId = `temp-${Date.now()}`;
        const tempFolder = {
            id: tempId,
            name,
            parentId: currentFolderId,
            information: { type: 'FOLDER' as const },
            createdAt: new Date(),
            trashedAt: null,
        } as TDatabaseDrive;
        setItems(prev => [tempFolder, ...prev]);

        // API call
        const res = await callAPI<{ item: TDatabaseDrive }>('createFolder', {
            method: 'POST',
            body: JSON.stringify({ name, parentId: currentFolderId || 'root' })
        });

        // Replace temp with real
        if ((res.status === 200 || res.status === 201) && res.data?.item) {
            setItems(prev => prev.map(i => i.id === tempId ? res.data!.item : i));
        } else {
            // Rollback
            setItems(prev => prev.filter(i => i.id !== tempId));
        }
    }, [callAPI, currentFolderId]);

    const renameItem = useCallback(async (id: string, newName: string) => {
        // Optimistic: Update name immediately
        setItems(prev => prev.map(i => i.id === id ? { ...i, name: newName } : i));

        // API call (fire and forget, already updated)
        await callAPI('rename', {
            method: 'PATCH',
            query: { id },
            body: JSON.stringify({ newName })
        });
    }, [callAPI]);

    const deleteItem = useCallback(async (id: string) => {
        // Optimistic: Remove from list immediately
        setItems(prev => prev.filter(i => i.id !== id));
        setSelectedFileIds(prev => prev.filter(sid => sid !== id));

        // API call
        if (currentView === 'TRASH') {
            await callAPI('deletePermanent', { query: { id } });
        } else {
            await callAPI('delete', { query: { id } });
        }
    }, [callAPI, currentView]);

    const moveItem = useCallback(async (id: string, targetFolderId: string) => {
        // Optimistic: Remove from current view (it's moving away)
        setItems(prev => prev.filter(i => i.id !== id));

        // API call
        await callAPI('move', {
            method: 'POST',
            body: JSON.stringify({ ids: [id], targetFolderId })
        });
    }, [callAPI]);

    const restoreItem = useCallback(async (id: string) => {
        // Optimistic: Remove from trash view immediately
        setItems(prev => prev.filter(i => i.id !== id));
        setSelectedFileIds(prev => prev.filter(sid => sid !== id));

        // API call in background
        await callAPI('restore', { method: 'POST', query: { id } });
    }, [callAPI]);

    // =========================================================================
    // UTILITIES
    // =========================================================================

    const createUrl = useCallback((driveFile: TDriveFile, options?: { quality?: TImageQuality; format?: TImageFormat }) => {
        return driveCreateUrl(driveFile, apiEndpoint, options);
    }, [apiEndpoint]);

    const createSrcSet = useCallback((driveFile: TDriveFile, format?: TImageFormat) => {
        return driveCreateSrcSet(driveFile, apiEndpoint, format);
    }, [apiEndpoint]);

    // =========================================================================
    // EFFECTS
    // =========================================================================

    // Load stored account on mount
    React.useEffect(() => {
        const stored = localStorage.getItem('drive_active_account');
        if (stored) setActiveAccountIdState(stored);
    }, []);

    // Fetch items when view/folder/account changes (skip if lazy and not yet triggered)
    React.useEffect(() => {
        if (!hasFetched) return;
        fetchItems();
    }, [fetchItems, hasFetched]);

    // Fetch accounts & quota on mount and account change (skip if lazy and not yet triggered)
    React.useEffect(() => {
        if (!hasFetched) return;
        refreshAccounts();
    }, [refreshAccounts, hasFetched]);
    React.useEffect(() => {
        if (!hasFetched) return;
        refreshQuota();
    }, [refreshQuota, activeAccountId, hasFetched]);

    // Trigger initial fetch (used by components to start fetching in lazy mode)
    const triggerFetch = React.useCallback(() => {
        if (!hasFetched) setHasFetched(true);
    }, [hasFetched]);

    // =========================================================================
    // RENDER
    // =========================================================================

    return (
        <DriveContext.Provider value={{
            apiEndpoint,
            withCredentials,

            // Navigation
            currentFolderId,
            path,
            navigateToFolder,
            navigateUp,

            // Items
            items,
            setItems,
            isLoading,
            error,
            fetchItems,
            triggerFetch,

            // Accounts
            accounts,
            activeAccountId,
            setActiveAccountId,
            refreshAccounts,
            availableProviders,

            // Storage
            quota,
            refreshQuota,

            // UI
            viewMode,
            setViewMode,
            currentView,
            setCurrentView,
            searchQuery,
            setSearchQuery,
            searchScope,
            setSearchScope,
            groupBy,
            setGroupBy,
            sortBy,
            setSortBy,

            // Selection
            selectionMode,
            selectedFileIds,
            setSelectedFileIds,

            // Pagination
            hasMore,
            isLoadingMore,
            loadMore,

            // Utilities
            createUrl,
            createSrcSet,
            callAPI,

            // Optimistic Actions
            createFolder,
            renameItem,
            deleteItem,
            moveItem,
            restoreItem,
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
