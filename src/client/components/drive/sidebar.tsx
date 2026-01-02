'use client';

import React, { useState } from 'react';
import { useDrive } from '@/client/context';
import { cn } from '@/client/utils';
import { Button } from '@/client/components/ui/button';
import { Input } from '@/client/components/ui/input';
import {
    Database, HardDrive, Plus, Check,
    ChevronsUpDown, FolderOpen, Trash2, Menu, Settings2, Pencil, Trash, Loader2, RefreshCw
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
} from "@/client/components/ui/dropdown-menu";
import {
    Sheet,
    SheetContent,
    SheetTrigger,
    SheetTitle,
    SheetDescription,
} from "@/client/components/ui/sheet";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/client/components/ui/dialog";
import { DialogConfirmation } from '@/client/components/dialog';
import { DriveStorageIndicator } from '@/client/components/drive/storage/indicator';

// ** Sidebar Content Component (reusable for both desktop and mobile)
const SidebarContent = (props: Readonly<{ onNavigate?: () => void }>) => {
    // ** Deconstruct Props
    const { onNavigate } = props;

    const {
        accounts, activeAccountId, setActiveAccountId,
        callAPI, refreshAccounts, currentView, setCurrentView, availableProviders
    } = useDrive();

    // Dialog states for account management
    const [renameDialog, setRenameDialog] = useState<{ open: boolean; account: typeof accounts[0] | null }>({
        open: false, account: null
    });
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; account: typeof accounts[0] | null }>({
        open: false, account: null
    });
    const [newName, setNewName] = useState('');
    const [oauthLoading, setOauthLoading] = useState(false);
    const [oauthAbort, setOauthAbort] = useState<AbortController | null>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const currentAccount = activeAccountId ? accounts.find(a => a.id === activeAccountId) : null;
    const currentAccountName = currentAccount?.name || 'Local Storage';
    const currentAccountEmail = currentAccount?.email || 'On this device';

    // Check if any provider is available
    const hasAnyProvider = availableProviders.google;
    // Disable dropdown if no accounts and no providers available
    const isDropdownDisabled = accounts.length === 0 && !hasAnyProvider;

    const handleRename = async () => {
        if (!renameDialog.account || !newName.trim()) return;
        await callAPI('renameAccount', {
            method: 'PATCH',
            query: { id: renameDialog.account.id },
            body: JSON.stringify({ name: newName.trim() })
        });
        await refreshAccounts();
        setRenameDialog({ open: false, account: null });
        setNewName('');
    };

    const handleDelete = async (): Promise<[true] | [false, string]> => {
        if (!deleteDialog.account) return [false, 'No account selected'];
        await callAPI('removeAccount', { query: { id: deleteDialog.account.id } });
        await refreshAccounts();
        if (activeAccountId === deleteDialog.account.id) setActiveAccountId(null);
        setDeleteDialog({ open: false, account: null });
        return [true];
    };

    const openOAuthPopup = () => {
        // Open popup immediately (synchronously) to avoid popup blocker
        const width = 600, height = 600;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        const popup = window.open('about:blank', 'Connect to Google Drive', `width=${width},height=${height},top=${top},left=${left}`);

        if (!popup) {
            alert('Popup blocked. Please allow popups for this site.');
            return;
        }

        // Show loading dialog
        const controller = new AbortController();
        setOauthAbort(controller);
        setOauthLoading(true);

        // Fetch auth URL and redirect popup
        (async () => {
            try {
                const res = await callAPI<{ url: string }>('getAuthUrl', { query: { provider: 'GOOGLE' } });

                if (controller.signal.aborted) {
                    popup.close();
                    return;
                }

                if (res.status !== 200 || !res.data?.url) {
                    popup.close();
                    setOauthLoading(false);
                    setOauthAbort(null);
                    alert(res.message || 'Failed to initialize account connection');
                    return;
                }

                // Redirect popup to auth URL
                popup.location.href = res.data.url;

                // Listen for OAuth success
                const cleanup = () => {
                    window.removeEventListener('message', messageListener);
                    window.removeEventListener('storage', storageListener);
                    setOauthLoading(false);
                    setOauthAbort(null);
                };
                const messageListener = (event: MessageEvent) => {
                    if (event.data === 'oauth-success') { cleanup(); refreshAccounts(); setDropdownOpen(true); }
                };
                const storageListener = (event: StorageEvent) => {
                    if (event.key === 'next-drive-oauth-success') { cleanup(); refreshAccounts(); setDropdownOpen(true); }
                };
                window.addEventListener('message', messageListener);
                window.addEventListener('storage', storageListener);

                // Also close loading if popup is closed manually
                const checkPopupClosed = setInterval(() => {
                    if (popup.closed) {
                        clearInterval(checkPopupClosed);
                        cleanup();
                    }
                }, 500);
            } catch (err) {
                popup.close();
                setOauthLoading(false);
                setOauthAbort(null);
                alert('Failed to connect. Please try again.');
            }
        })();
    };

    const cancelOAuth = () => {
        oauthAbort?.abort();
        setOauthLoading(false);
        setOauthAbort(null);
    };

    return (
        <div className="w-full h-full flex flex-col bg-muted/5 dark:bg-muted/10">
            {/* Account Switcher - Compact */}
            <div className="p-2 border-b border-border/50">
                <div className="flex items-center gap-1">
                    {isDropdownDisabled ? (
                        /* Static display when no accounts and no providers */
                        <div className="flex-1 flex items-center gap-2.5 px-2 h-11 min-w-0">
                            <div className="size-7 rounded-md flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                                <HardDrive className="size-3.5" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-medium truncate">Local Storage</span>
                                <span className="text-[11px] text-muted-foreground truncate">On this device</span>
                            </div>
                        </div>
                    ) : (
                        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="flex-1 min-w-0 justify-between px-2 h-11 hover:bg-muted/50 dark:hover:bg-muted/30">
                                    <div className="flex items-center gap-2.5 text-left min-w-0 flex-1">
                                        <div className={cn(
                                            "size-7 rounded-md flex items-center justify-center shrink-0",
                                            activeAccountId
                                                ? "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                                                : "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                                        )}>
                                            {activeAccountId ? <Database className="size-3.5" /> : <HardDrive className="size-3.5" />}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-medium truncate">{currentAccountName}</span>
                                            <span className="text-[11px] text-muted-foreground truncate">{currentAccountEmail}</span>
                                        </div>
                                    </div>
                                    <ChevronsUpDown className="size-3.5 text-muted-foreground/60 shrink-0" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="start">
                                <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                                    Storage
                                </DropdownMenuLabel>

                                {/* Local Storage */}
                                <DropdownMenuItem onClick={() => { setActiveAccountId(null); setCurrentView('BROWSE'); onNavigate?.(); }} className="gap-2 py-2">
                                    <span className="flex-1 text-sm">Local Storage</span>
                                    {activeAccountId === null && <Check className="size-3.5 text-primary" />}
                                </DropdownMenuItem>

                                {accounts.length > 0 && <DropdownMenuSeparator />}

                                {/* Connected Accounts */}
                                {accounts.map(account => (
                                    <DropdownMenuItem
                                        key={account.id}
                                        onClick={() => { setActiveAccountId(account.id); setCurrentView('BROWSE'); onNavigate?.(); }}
                                        className="gap-2 py-2"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm truncate">{account.name}</p>
                                            <p className="text-[10px] text-muted-foreground truncate">{account.email}</p>
                                        </div>
                                        {activeAccountId === account.id && <Check className="size-3.5 text-primary" />}
                                    </DropdownMenuItem>
                                ))}

                                {/* Add Account - only show if any provider is available */}
                                {hasAnyProvider && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuSub>
                                            <DropdownMenuSubTrigger className="gap-2">
                                                <Plus className="size-3.5" />
                                                <span className="text-sm">Add Account</span>
                                            </DropdownMenuSubTrigger>
                                            <DropdownMenuSubContent>
                                                {availableProviders.google && (
                                                    <DropdownMenuItem onClick={openOAuthPopup}>
                                                        Google Drive
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuSubContent>
                                        </DropdownMenuSub>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    {/* Settings button - only for connected accounts */}
                    {currentAccount && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-9 shrink-0 hover:bg-muted/50 dark:hover:bg-muted/30"
                                >
                                    <Settings2 className="size-4 text-muted-foreground" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuLabel className="text-xs text-muted-foreground truncate">
                                    {currentAccount.name}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => {
                                    setNewName(currentAccount.name);
                                    setRenameDialog({ open: true, account: currentAccount });
                                }}>
                                    <Pencil className="size-3.5 mr-2" />
                                    Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleConnectGoogle}>
                                    <RefreshCw className="size-3.5 mr-2" />
                                    Reconnect
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setDeleteDialog({ open: true, account: currentAccount })}
                                >
                                    <Trash className="size-3.5 mr-2" />
                                    Disconnect
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-2 space-y-0.5">
                <Button
                    variant="ghost"
                    className={cn(
                        "w-full justify-start gap-2.5 h-9 px-2.5 font-medium",
                        currentView !== 'TRASH'
                            ? "bg-primary/10 text-primary hover:bg-primary/15 dark:bg-primary/15 dark:hover:bg-primary/20"
                            : "hover:bg-muted/50 dark:hover:bg-muted/30"
                    )}
                    onClick={() => { setCurrentView('BROWSE'); onNavigate?.(); }}
                >
                    <FolderOpen className="size-4" />
                    My Files
                </Button>
                <Button
                    variant="ghost"
                    className={cn(
                        "w-full justify-start gap-2.5 h-9 px-2.5 font-medium",
                        currentView === 'TRASH'
                            ? "bg-destructive/10 text-destructive hover:bg-destructive/15 dark:bg-destructive/15"
                            : "hover:bg-muted/50 dark:hover:bg-muted/30"
                    )}
                    onClick={() => { setCurrentView('TRASH'); onNavigate?.(); }}
                >
                    <Trash2 className="size-4" />
                    Trash
                </Button>
            </nav>

            {/* Storage Indicator */}
            <div className="p-2.5 border-t border-border/50 bg-background/50 dark:bg-background/30">
                <DriveStorageIndicator />
            </div>

            {/* Rename Dialog */}
            <Dialog open={renameDialog.open} onOpenChange={(open) => !open && setRenameDialog({ open: false, account: null })}>
                <DialogContent className="sm:max-w-sm" showCloseButton={false}>
                    <DialogHeader>
                        <DialogTitle>Rename Account</DialogTitle>
                        <DialogDescription>Enter a new display name for this storage account.</DialogDescription>
                    </DialogHeader>
                    <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Account name"
                        onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRenameDialog({ open: false, account: null })}>
                            Cancel
                        </Button>
                        <Button onClick={handleRename} disabled={!newName.trim()}>
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Disconnect Confirmation */}
            <DialogConfirmation
                open={deleteDialog.open}
                onClose={() => setDeleteDialog({ open: false, account: null })}
                title="Disconnect Account"
                description={`Are you sure you want to disconnect "${deleteDialog.account?.name}"? Access will be revoked and synced files will be removed from local cache.`}
                onConfirm={handleDelete}
            />

            {/* OAuth Loading Dialog */}
            <Dialog open={oauthLoading} onOpenChange={(open) => !open && cancelOAuth()}>
                <DialogContent className="sm:max-w-xs" showCloseButton={false}>
                    <div className="flex flex-col items-center gap-4 py-4">
                        <Loader2 className="size-8 text-primary animate-spin" />
                        <div className="text-center">
                            <DialogTitle className="text-base">Connecting...</DialogTitle>
                            <DialogDescription className="text-sm mt-1">
                                Preparing Google authentication
                            </DialogDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={cancelOAuth}>
                            Cancel
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

// ** Desktop Sidebar (always visible on larger screens)
export const DriveSidebar = ({ className }: { className?: string }) => {
    const [sheetOpen, setSheetOpen] = useState(false);

    return (
        <div className={className}>
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-9" aria-label="Open menu">
                        <Menu className="size-5" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-70 sm:w-80 p-0" hideCloseButton>
                    <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                    <SheetDescription className="sr-only">Storage accounts and navigation</SheetDescription>
                    <SidebarContent onNavigate={() => setSheetOpen(false)} />
                </SheetContent>
            </Sheet>
        </div>
    );
};
