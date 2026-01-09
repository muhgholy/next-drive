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
import { RenameAccountDialog } from '@/client/components/drive/RenameAccountDialog';
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

    const handleRename = async (account: typeof accounts[0], newName: string) => {
        if (!account || !newName.trim()) return;
        await callAPI('renameAccount', {
            method: 'PATCH',
            query: { id: account.id },
            body: JSON.stringify({ name: newName.trim() })
        });
        await refreshAccounts();
        setRenameDialog({ open: false, account: null });
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
        <div className="nd:w-full nd:h-full nd:flex nd:flex-col nd:bg-muted/5 nd:dark:bg-muted/10">
            {/* Account Switcher - Compact */}
            <div className="nd:p-2 nd:border-b nd:border-border/50">
                <div className="nd:flex nd:items-center nd:gap-1">
                    {isDropdownDisabled ? (
                        /* Static display when no accounts and no providers */
                        <div className="nd:flex-1 nd:flex nd:items-center nd:gap-2.5 nd:px-2 nd:h-11 nd:min-w-0">
                            <div className="nd:size-7 nd:rounded-md nd:flex nd:items-center nd:justify-center nd:shrink-0 nd:bg-emerald-500/10 nd:text-emerald-600 nd:dark:bg-emerald-500/20 nd:dark:text-emerald-400">
                                <HardDrive className="nd:size-3.5" />
                            </div>
                            <div className="nd:flex nd:flex-col nd:min-w-0">
                                <span className="nd:text-sm nd:font-medium nd:truncate">Local Storage</span>
                                <span className="nd:text-[11px] nd:text-muted-foreground nd:truncate">On this device</span>
                            </div>
                        </div>
                    ) : (
                        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="nd:flex-1 nd:min-w-0 nd:justify-between nd:px-2 nd:h-11 nd:hover:bg-muted/50 nd:dark:hover:bg-muted/30">
                                    <div className="nd:flex nd:items-center nd:gap-2.5 nd:text-left nd:min-w-0 nd:flex-1">
                                        <div className={cn(
                                            "nd:size-7 nd:rounded-md nd:flex nd:items-center nd:justify-center nd:shrink-0",
                                            activeAccountId
                                                ? "nd:bg-blue-500/10 nd:text-blue-600 nd:dark:bg-blue-500/20 nd:dark:text-blue-400"
                                                : "nd:bg-emerald-500/10 nd:text-emerald-600 nd:dark:bg-emerald-500/20 nd:dark:text-emerald-400"
                                        )}>
                                            {activeAccountId ? <Database className="nd:size-3.5" /> : <HardDrive className="nd:size-3.5" />}
                                        </div>
                                        <div className="nd:flex nd:flex-col nd:min-w-0">
                                            <span className="nd:text-sm nd:font-medium nd:truncate">{currentAccountName}</span>
                                            <span className="nd:text-[11px] nd:text-muted-foreground nd:truncate">{currentAccountEmail}</span>
                                        </div>
                                    </div>
                                    <ChevronsUpDown className="nd:size-3.5 nd:text-muted-foreground/60 nd:shrink-0" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="nd:w-56" align="start">
                                <DropdownMenuLabel className="nd:text-[11px] nd:font-medium nd:text-muted-foreground nd:uppercase nd:tracking-wide">
                                    Storage
                                </DropdownMenuLabel>

                                {/* Local Storage */}
                                <DropdownMenuItem onClick={() => { setActiveAccountId(null); setCurrentView('BROWSE'); onNavigate?.(); }} className="nd:gap-2 nd:py-2">
                                    <span className="nd:flex-1 nd:text-sm">Local Storage</span>
                                    {activeAccountId === null && <Check className="nd:size-3.5 nd:text-primary" />}
                                </DropdownMenuItem>

                                {accounts.length > 0 && <DropdownMenuSeparator />}

                                {/* Connected Accounts */}
                                {accounts.map(account => (
                                    <DropdownMenuItem
                                        key={account.id}
                                        onClick={() => { setActiveAccountId(account.id); setCurrentView('BROWSE'); onNavigate?.(); }}
                                        className="nd:gap-2 nd:py-2"
                                    >
                                        <div className="nd:flex-1 nd:min-w-0">
                                            <p className="nd:text-sm nd:truncate">{account.name}</p>
                                            <p className="nd:text-[10px] nd:text-muted-foreground nd:truncate">{account.email}</p>
                                        </div>
                                        {activeAccountId === account.id && <Check className="nd:size-3.5 nd:text-primary" />}
                                    </DropdownMenuItem>
                                ))}

                                {/* Add Account - only show if any provider is available */}
                                {hasAnyProvider && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuSub>
                                            <DropdownMenuSubTrigger className="nd:gap-2">
                                                <Plus className="nd:size-3.5" />
                                                <span className="nd:text-sm">Add Account</span>
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
                                    className="nd:size-9 nd:shrink-0 nd:hover:bg-muted/50 nd:dark:hover:bg-muted/30"
                                >
                                    <Settings2 className="nd:size-4 nd:text-muted-foreground" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="nd:w-40">
                                <DropdownMenuLabel className="nd:text-xs nd:text-muted-foreground nd:truncate">
                                    {currentAccount.name}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => {
                                    setRenameDialog({ open: true, account: currentAccount });
                                }}>
                                    <Pencil className="nd:size-3.5 nd:mr-2" />
                                    Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={openOAuthPopup}>
                                    <RefreshCw className="nd:size-3.5 nd:mr-2" />
                                    Reconnect
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="nd:text-destructive nd:focus:text-destructive"
                                    onClick={() => setDeleteDialog({ open: true, account: currentAccount })}
                                >
                                    <Trash className="nd:size-3.5 nd:mr-2" />
                                    Disconnect
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="nd:flex-1 nd:p-2 nd:space-y-0.5">
                <Button
                    variant="ghost"
                    className={cn(
                        "nd:w-full nd:justify-start nd:gap-2.5 nd:h-9 nd:px-2.5 nd:font-medium",
                        currentView !== 'TRASH'
                            ? "nd:bg-primary/10 nd:text-primary nd:hover:bg-primary/15 nd:dark:bg-primary/15 nd:dark:hover:bg-primary/20"
                            : "nd:hover:bg-muted/50 nd:dark:hover:bg-muted/30"
                    )}
                    onClick={() => { setCurrentView('BROWSE'); onNavigate?.(); }}
                >
                    <FolderOpen className="nd:size-4" />
                    My Files
                </Button>
                <Button
                    variant="ghost"
                    className={cn(
                        "nd:w-full nd:justify-start nd:gap-2.5 nd:h-9 nd:px-2.5 nd:font-medium",
                        currentView === 'TRASH'
                            ? "nd:bg-destructive/10 nd:text-destructive nd:hover:bg-destructive/15 nd:dark:bg-destructive/15"
                            : "nd:hover:bg-muted/50 nd:dark:hover:bg-muted/30"
                    )}
                    onClick={() => { setCurrentView('TRASH'); onNavigate?.(); }}
                >
                    <Trash2 className="nd:size-4" />
                    Trash
                </Button>
            </nav>

            {/* Storage Indicator */}
            <div className="nd:p-2.5 nd:border-t nd:border-border/50 nd:bg-background/50 nd:dark:bg-background/30">
                <DriveStorageIndicator />
            </div>

            {/* Rename Dialog */}
            <RenameAccountDialog
                open={renameDialog.open}
                onClose={() => setRenameDialog({ open: false, account: null })}
                account={renameDialog.account}
                onConfirm={handleRename}
            />

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
                <DialogContent className="nd:sm:max-w-xs" showCloseButton={false}>
                    <div className="nd:flex nd:flex-col nd:items-center nd:gap-4 nd:py-4">
                        <Loader2 className="nd:size-8 nd:text-primary nd:animate-spin" />
                        <div className="nd:text-center">
                            <DialogTitle className="nd:text-base">Connecting...</DialogTitle>
                            <DialogDescription className="nd:text-sm nd:mt-1">
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
                    <Button variant="ghost" size="icon" className="nd:size-9" aria-label="Open menu">
                        <Menu className="nd:size-5" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="nd:w-70 nd:sm:w-80 nd:p-0" hideCloseButton>
                    <SheetTitle className="nd:sr-only">Navigation Menu</SheetTitle>
                    <SheetDescription className="nd:sr-only">Storage accounts and navigation</SheetDescription>
                    <SidebarContent onNavigate={() => setSheetOpen(false)} />
                </SheetContent>
            </Sheet>
        </div>
    );
};
