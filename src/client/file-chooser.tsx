// ** Drive File Chooser Component - Completely Redesigned
'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { TDriveFile } from '@/types/client';
import { useDrive } from '@/client/context';
import { cn, getFileIcon } from '@/client/utils';

// ** UI Components
import { Button } from '@/client/components/ui/button';
import { Input } from '@/client/components/ui/input';
import {
    Dialog2,
    Dialog2Content,
    Dialog2Header,
    Dialog2Body,
    Dialog2Footer,
    Dialog2Title,
} from '@/client/components/ui/dialog-fullscreen';
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
import { DialogConfirmation } from '@/client/components/dialog';
import { RenameAccountDialog } from '@/client/components/drive/RenameAccountDialog';

// ** Drive Components
import { DriveFileGrid } from '@/client/components/drive/file-grid';
import { DriveDndProvider } from '@/client/components/drive/dnd-provider';
import { DriveHeader } from '@/client/components/drive/header';
import { DrivePathBar } from '@/client/components/drive/path-bar';
import { DriveUpload } from '@/client/components/drive/upload';
import { DriveStorageIndicator } from '@/client/components/drive/storage/indicator';

// ** Icons
import {
    Upload as UploadIcon, X, Menu, FolderOpen, Trash2,
    Database, HardDrive, ChevronsUpDown, Check, Plus, Settings2, Pencil, Trash, Loader2, RefreshCw
} from 'lucide-react';

// ============================================================================
// INLINE SIDEBAR - Simplified for the chooser context
// ============================================================================
const ChooserSidebar = (props: Readonly<{ onNavigate?: () => void }>) => {
    // ** Deconstruct Props
    const { onNavigate } = props;

    const {
        accounts, activeAccountId, setActiveAccountId,
        callAPI, refreshAccounts, currentView, setCurrentView, availableProviders
    } = useDrive();

    const [renameDialog, setRenameDialog] = useState<{ open: boolean; account: typeof accounts[0] | null }>({ open: false, account: null });
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; account: typeof accounts[0] | null }>({ open: false, account: null });
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
        await callAPI('renameAccount', { method: 'PATCH', query: { id: account.id }, body: JSON.stringify({ name: newName.trim() }) });
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
                    window.removeEventListener('message', ml);
                    window.removeEventListener('storage', sl);
                    setOauthLoading(false);
                    setOauthAbort(null);
                };
                const ml = (e: MessageEvent) => { if (e.data === 'oauth-success') { cleanup(); refreshAccounts(); setDropdownOpen(true); } };
                const sl = (e: StorageEvent) => { if (e.key === 'next-drive-oauth-success') { cleanup(); refreshAccounts(); setDropdownOpen(true); } };
                window.addEventListener('message', ml);
                window.addEventListener('storage', sl);

                // Also close loading if popup is closed manually
                const checkPopupClosed = setInterval(() => {
                    if (popup.closed) {
                        clearInterval(checkPopupClosed);
                        cleanup();
                    }
                }, 500);
            } catch {
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
        <div className="nd:flex nd:flex-col nd:h-full nd:w-full nd:bg-muted/5 nd:dark:bg-muted/10">
            {/* Account Switcher */}
            <div className="nd:p-2 nd:border-b nd:border-border/50">
                <div className="nd:flex nd:items-center nd:gap-1">
                    {isDropdownDisabled ? (
                        /* Static display when no accounts and no providers */
                        <div className="nd:flex-1 nd:flex nd:items-center nd:gap-2 nd:px-2 nd:h-11 nd:min-w-0">
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
                                    <div className="nd:flex nd:items-center nd:gap-2 nd:text-left nd:min-w-0 nd:flex-1">
                                        <div className={cn(
                                            "nd:size-7 nd:rounded-md nd:flex nd:items-center nd:justify-center nd:shrink-0",
                                            activeAccountId ? "nd:bg-blue-500/10 nd:text-blue-600 nd:dark:bg-blue-500/20 nd:dark:text-blue-400" : "nd:bg-emerald-500/10 nd:text-emerald-600 nd:dark:bg-emerald-500/20 nd:dark:text-emerald-400"
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
                                <DropdownMenuLabel className="nd:text-[11px] nd:font-medium nd:text-muted-foreground nd:uppercase nd:tracking-wide">Storage</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => { setActiveAccountId(null); setCurrentView('BROWSE'); onNavigate?.(); }} className="nd:gap-2 nd:py-2">
                                    <span className="nd:flex-1 nd:text-sm">Local Storage</span>
                                    {activeAccountId === null && <Check className="nd:size-3.5 nd:text-primary" />}
                                </DropdownMenuItem>
                                {accounts.length > 0 && <DropdownMenuSeparator />}
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
                                            <DropdownMenuSubTrigger className="nd:gap-2"><Plus className="nd:size-3.5" /><span className="nd:text-sm">Add Account</span></DropdownMenuSubTrigger>
                                            <DropdownMenuSubContent>
                                                {availableProviders.google && (
                                                    <DropdownMenuItem onClick={openOAuthPopup}>Google Drive</DropdownMenuItem>
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
                                <Button variant="ghost" size="icon" className="nd:size-9 nd:shrink-0 nd:hover:bg-muted/50 nd:dark:hover:bg-muted/30">
                                    <Settings2 className="nd:size-4 nd:text-muted-foreground" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="nd:w-40">
                                <DropdownMenuLabel className="nd:text-xs nd:text-muted-foreground nd:truncate">
                                    {currentAccount.name}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => { setRenameDialog({ open: true, account: currentAccount }); }}>
                                    <Pencil className="nd:size-3.5 nd:mr-2" /> Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={openOAuthPopup}>
                                    <RefreshCw className="nd:size-3.5 nd:mr-2" /> Reconnect
                                </DropdownMenuItem>
                                <DropdownMenuItem className="nd:text-destructive nd:focus:text-destructive" onClick={() => setDeleteDialog({ open: true, account: currentAccount })}>
                                    <Trash className="nd:size-3.5 nd:mr-2" /> Disconnect
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
                    className={cn("nd:w-full nd:justify-start nd:gap-2.5 nd:h-9 nd:px-2.5 nd:font-medium", currentView !== 'TRASH' ? "nd:bg-primary/10 nd:text-primary nd:hover:bg-primary/15" : "nd:hover:bg-muted/50")}
                    onClick={() => { setCurrentView('BROWSE'); onNavigate?.(); }}
                >
                    <FolderOpen className="nd:size-4" /> My Files
                </Button>
                <Button
                    variant="ghost"
                    className={cn("nd:w-full nd:justify-start nd:gap-2.5 nd:h-9 nd:px-2.5 nd:font-medium", currentView === 'TRASH' ? "nd:bg-destructive/10 nd:text-destructive nd:hover:bg-destructive/15" : "nd:hover:bg-muted/50")}
                    onClick={() => { setCurrentView('TRASH'); onNavigate?.(); }}
                >
                    <Trash2 className="nd:size-4" /> Trash
                </Button>
            </nav>

            {/* Storage */}
            <div className="nd:p-2.5 nd:border-t nd:border-border/50 nd:bg-background/50 nd:dark:bg-background/30">
                <DriveStorageIndicator />
            </div>

            {/* Dialogs */}
            <RenameAccountDialog
                open={renameDialog.open}
                onClose={() => setRenameDialog({ open: false, account: null })}
                account={renameDialog.account}
                onConfirm={handleRename}
            />

            <DialogConfirmation
                open={deleteDialog.open}
                onClose={() => setDeleteDialog({ open: false, account: null })}
                title="Disconnect Account"
                description={`Disconnect "${deleteDialog.account?.name}"? Access will be revoked and synced files will be removed.`}
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

// ============================================================================
// MOBILE SIDEBAR SHEET
// ============================================================================
const MobileSidebarSheet = () => {
    const [sheetOpen, setSheetOpen] = useState(false);

    return (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="nd:size-9 nd:md:hidden nd:shrink-0">
                    <Menu className="nd:size-5" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="nd:w-72 nd:p-0" hideCloseButton>
                <SheetTitle className="nd:sr-only">Navigation</SheetTitle>
                <SheetDescription className="nd:sr-only">Storage and navigation</SheetDescription>
                <ChooserSidebar onNavigate={() => setSheetOpen(false)} />
            </SheetContent>
        </Sheet>
    );
};

// ============================================================================
// MAIN FILE CHOOSER COMPONENT
// ============================================================================
export const DriveFileChooser = (props: Readonly<{
    value?: TDriveFile | TDriveFile[] | null;
    onChange: (files: TDriveFile | TDriveFile[] | null) => void;
    multiple?: boolean;
    accept?: string;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    error?: boolean;
    helperText?: string;
}>) => {
    // ** Deconstruct Props
    const {
        value = null, onChange, multiple = false, accept, placeholder = 'Choose files...',
        className, disabled = false, error, helperText
    } = props;

    const { items, selectedFileIds, setSelectedFileIds, createUrl, triggerFetch } = useDrive();
    const [isOpen, setIsOpen] = useState(false);

    // Sync selection on open and trigger fetch
    useEffect(() => {
        if (isOpen) {
            // Trigger API fetch when dialog opens (for lazy mode)
            triggerFetch();

            if (!value) setSelectedFileIds([]);
            else if (Array.isArray(value)) setSelectedFileIds(value.map(f => f.id));
            else setSelectedFileIds([value.id]);
        }
    }, [isOpen, value, setSelectedFileIds, triggerFetch]);

    const handleConfirm = useCallback(() => {
        const selectedItems = items.filter(item => selectedFileIds.includes(item.id));
        const files: TDriveFile[] = selectedItems.map(item => ({
            id: item.id,
            file: {
                name: item.name,
                mime: item.information.type === 'FILE' ? item.information.mime : '',
                size: item.information.type === 'FILE' ? item.information.sizeInBytes : 0
            }
        }));
        onChange(multiple ? files : files[0] || null);
        setIsOpen(false);
    }, [items, selectedFileIds, multiple, onChange]);

    const handleRemove = useCallback((idToRemove: string) => {
        if (multiple && Array.isArray(value)) onChange(value.filter(f => f.id !== idToRemove));
        else onChange(null);
    }, [multiple, value, onChange]);

    const hasSelection = value && (Array.isArray(value) ? value.length > 0 : true);
    const displayFiles = useMemo(() => !value ? [] : Array.isArray(value) ? value : [value], [value]);

    return (
        <div className={cn("nd:w-full", className)}>
            {/* Trigger Button */}
            {!hasSelection ? (
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(true)}
                    disabled={disabled}
                    className={cn(
                        "nd:w-full nd:h-auto nd:justify-start nd:gap-3 nd:px-3 nd:py-2.5 nd:border-dashed",
                        error && "nd:border-destructive"
                    )}
                >
                    <div className={cn(
                        "nd:size-9 nd:rounded-lg nd:flex nd:items-center nd:justify-center nd:shrink-0",
                        error ? "nd:bg-destructive/10 nd:text-destructive" : "nd:bg-muted/50 nd:text-muted-foreground"
                    )}>
                        <UploadIcon className="nd:size-4" />
                    </div>
                    <div className="nd:flex-1 nd:min-w-0 nd:text-left">
                        <p className={cn("nd:text-sm nd:font-medium", error && "nd:text-destructive")}>
                            {multiple ? "Select files" : "Select a file"}
                        </p>
                        <p className="nd:text-xs nd:text-muted-foreground nd:font-normal nd:truncate">{placeholder}</p>
                    </div>
                </Button>
            ) : (
                /* Selected Files Display */
                <div className={cn("nd:rounded-lg nd:border", error ? "nd:border-destructive" : "nd:border-border", disabled && "nd:opacity-50")}>
                    {!multiple && displayFiles[0] && displayFiles[0].file && (
                        <div className="nd:flex nd:items-center nd:gap-3 nd:p-2.5">
                            <div className="nd:size-12 nd:rounded-lg nd:overflow-hidden nd:bg-muted/30 nd:flex nd:items-center nd:justify-center nd:shrink-0">
                                {displayFiles[0].file.mime?.startsWith('image/') ? (
                                    <img src={createUrl(displayFiles[0])} alt={displayFiles[0].file.name || ''} className="nd:size-full nd:object-cover" />
                                ) : (
                                    getFileIcon(displayFiles[0].file.mime || '', false, "nd:size-6 nd:text-muted-foreground")
                                )}
                            </div>
                            <div className="nd:flex-1 nd:min-w-0">
                                <p className="nd:text-sm nd:font-medium nd:truncate">{displayFiles[0].file.name || 'Unknown'}</p>
                                <p className="nd:text-xs nd:text-muted-foreground">{displayFiles[0].file.mime || 'File'}</p>
                            </div>
                            <div className="nd:flex nd:items-center nd:gap-1 nd:shrink-0">
                                <Button type="button" variant="ghost" size="sm" onClick={() => setIsOpen(true)} disabled={disabled}>Change</Button>
                                {!disabled && (
                                    <Button type="button" variant="ghost" size="icon" className="nd:size-8" onClick={() => handleRemove(displayFiles[0].id)}>
                                        <X className="nd:size-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    {multiple && (
                        <>
                            <div className="nd:flex nd:items-center nd:justify-between nd:px-3 nd:py-2 nd:border-b nd:bg-muted/20">
                                <span className="nd:text-xs nd:text-muted-foreground nd:font-medium">{displayFiles.length} file{displayFiles.length !== 1 ? 's' : ''} selected</span>
                                <div className="nd:flex nd:items-center nd:gap-1">
                                    <Button type="button" variant="ghost" size="sm" className="nd:h-7 nd:text-xs" onClick={() => setIsOpen(true)} disabled={disabled}>Add more</Button>
                                    {!disabled && <Button type="button" variant="ghost" size="sm" className="nd:h-7 nd:text-xs nd:text-muted-foreground" onClick={() => onChange([])}>Clear</Button>}
                                </div>
                            </div>
                            <div className="nd:max-h-40 nd:overflow-y-auto nd:divide-y nd:divide-border/50">
                                {displayFiles.filter(file => file?.file).map((file) => (
                                    <div key={file.id} className="nd:flex nd:items-center nd:gap-2.5 nd:px-3 nd:py-2 nd:hover:bg-muted/20">
                                        <div className="nd:size-8 nd:rounded nd:overflow-hidden nd:bg-muted/30 nd:flex nd:items-center nd:justify-center nd:shrink-0">
                                            {file.file.mime?.startsWith('image/') ? (
                                                <img src={createUrl(file)} alt={file.file.name || ''} className="nd:size-full nd:object-cover" />
                                            ) : (
                                                getFileIcon(file.file.mime || '', false, "nd:size-4 nd:text-muted-foreground")
                                            )}
                                        </div>
                                        <span className="nd:flex-1 nd:text-sm nd:truncate">{file.file.name || 'Unknown'}</span>
                                        {!disabled && (
                                            <Button type="button" variant="ghost" size="icon" className="nd:size-7 nd:shrink-0" onClick={() => handleRemove(file.id)}>
                                                <X className="nd:size-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {error && helperText && <p className="nd:text-xs nd:text-destructive nd:mt-1.5">{helperText}</p>}

            {/* File Picker Dialog */}
            <Dialog2 open={isOpen} onOpenChange={setIsOpen}>
                <Dialog2Content showCloseButton={false} className="nd-drive-root">
                    {/* Header */}
                    <Dialog2Header className="nd:gap-2">
                        <MobileSidebarSheet />
                        <Dialog2Title className="nd:flex-1">Select {multiple ? 'Files' : 'File'}</Dialog2Title>
                        <Button type="button" variant="ghost" size="icon" className="nd:size-8" onClick={() => setIsOpen(false)}>
                            <X className="nd:size-4" />
                        </Button>
                    </Dialog2Header>

                    {/* Body */}
                    <Dialog2Body className="nd:flex nd:flex-col nd:md:flex-row">
                        {/* Sidebar - Desktop */}
                        <div className="nd:hidden nd:md:flex nd:w-52 nd:lg:w-56 nd:border-r nd:shrink-0">
                            <ChooserSidebar />
                        </div>

                        {/* Main Content */}
                        <DriveDndProvider>
                            <div className="nd:flex-1 nd:flex nd:flex-col nd:min-w-0 nd:min-h-0">
                                <DriveHeader className="nd:border-b" />
                                <div className="nd:flex nd:items-center nd:gap-2 nd:px-3 nd:py-2 nd:border-b nd:bg-muted/20 nd:dark:bg-muted/10">
                                    <DrivePathBar className="nd:flex-1" />
                                    <DriveUpload compact accept={accept} />
                                </div>
                                <DriveFileGrid mimeFilter={accept} className="nd:flex-1" />
                            </div>
                        </DriveDndProvider>
                    </Dialog2Body>

                    {/* Footer */}
                    <Dialog2Footer>
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <Button type="button" onClick={handleConfirm} disabled={selectedFileIds.length === 0}>
                            Select{selectedFileIds.length > 0 ? ` (${selectedFileIds.length})` : ''}
                        </Button>
                    </Dialog2Footer>
                </Dialog2Content>
            </Dialog2>
        </div>
    );
};
