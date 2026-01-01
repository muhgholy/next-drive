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
     Database, HardDrive, ChevronsUpDown, Check, Plus, Settings2, Pencil, Trash, Loader2
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
          await callAPI('renameAccount', { method: 'PATCH', query: { id: renameDialog.account.id }, body: JSON.stringify({ name: newName.trim() }) });
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
          <div className="flex flex-col h-full w-full bg-muted/5 dark:bg-muted/10">
               {/* Account Switcher */}
               <div className="p-2 border-b border-border/50">
                    <div className="flex items-center gap-1">
                         {isDropdownDisabled ? (
                              /* Static display when no accounts and no providers */
                              <div className="flex-1 flex items-center gap-2 px-2 h-11 min-w-0">
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
                                             <div className="flex items-center gap-2 text-left min-w-0 flex-1">
                                                  <div className={cn(
                                                       "size-7 rounded-md flex items-center justify-center shrink-0",
                                                       activeAccountId ? "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400" : "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
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
                                        <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Storage</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => { setActiveAccountId(null); setCurrentView('BROWSE'); onNavigate?.(); }} className="gap-2 py-2">
                                             <span className="flex-1 text-sm">Local Storage</span>
                                             {activeAccountId === null && <Check className="size-3.5 text-primary" />}
                                        </DropdownMenuItem>
                                        {accounts.length > 0 && <DropdownMenuSeparator />}
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
                                                       <DropdownMenuSubTrigger className="gap-2"><Plus className="size-3.5" /><span className="text-sm">Add Account</span></DropdownMenuSubTrigger>
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
                                        <Button variant="ghost" size="icon" className="size-9 shrink-0 hover:bg-muted/50 dark:hover:bg-muted/30">
                                             <Settings2 className="size-4 text-muted-foreground" />
                                        </Button>
                                   </DropdownMenuTrigger>
                                   <DropdownMenuContent align="end" className="w-40">
                                        <DropdownMenuLabel className="text-xs text-muted-foreground truncate">
                                             {currentAccount.name}
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => { setNewName(currentAccount.name); setRenameDialog({ open: true, account: currentAccount }); }}>
                                             <Pencil className="size-3.5 mr-2" /> Rename
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteDialog({ open: true, account: currentAccount })}>
                                             <Trash className="size-3.5 mr-2" /> Disconnect
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
                         className={cn("w-full justify-start gap-2.5 h-9 px-2.5 font-medium", currentView !== 'TRASH' ? "bg-primary/10 text-primary hover:bg-primary/15" : "hover:bg-muted/50")}
                         onClick={() => { setCurrentView('BROWSE'); onNavigate?.(); }}
                    >
                         <FolderOpen className="size-4" /> My Files
                    </Button>
                    <Button
                         variant="ghost"
                         className={cn("w-full justify-start gap-2.5 h-9 px-2.5 font-medium", currentView === 'TRASH' ? "bg-destructive/10 text-destructive hover:bg-destructive/15" : "hover:bg-muted/50")}
                         onClick={() => { setCurrentView('TRASH'); onNavigate?.(); }}
                    >
                         <Trash2 className="size-4" /> Trash
                    </Button>
               </nav>

               {/* Storage */}
               <div className="p-2.5 border-t border-border/50 bg-background/50 dark:bg-background/30">
                    <DriveStorageIndicator />
               </div>

               {/* Dialogs */}
               <Dialog open={renameDialog.open} onOpenChange={(open) => !open && setRenameDialog({ open: false, account: null })}>
                    <DialogContent className="sm:max-w-sm" showCloseButton={false}>
                         <DialogHeader>
                              <DialogTitle>Rename Account</DialogTitle>
                              <DialogDescription>Enter a new display name.</DialogDescription>
                         </DialogHeader>
                         <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Account name" onKeyDown={(e) => e.key === 'Enter' && handleRename()} />
                         <DialogFooter>
                              <Button variant="outline" onClick={() => setRenameDialog({ open: false, account: null })}>Cancel</Button>
                              <Button onClick={handleRename} disabled={!newName.trim()}>Save</Button>
                         </DialogFooter>
                    </DialogContent>
               </Dialog>

               <DialogConfirmation
                    open={deleteDialog.open}
                    onClose={() => setDeleteDialog({ open: false, account: null })}
                    title="Disconnect Account"
                    description={`Disconnect "${deleteDialog.account?.name}"? Access will be revoked and synced files will be removed.`}
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

// ============================================================================
// MOBILE SIDEBAR SHEET
// ============================================================================
const MobileSidebarSheet = () => {
     const [sheetOpen, setSheetOpen] = useState(false);

     return (
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
               <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-9 md:hidden shrink-0">
                         <Menu className="size-5" />
                    </Button>
               </SheetTrigger>
               <SheetContent side="left" className="w-72 p-0" hideCloseButton>
                    <SheetTitle className="sr-only">Navigation</SheetTitle>
                    <SheetDescription className="sr-only">Storage and navigation</SheetDescription>
                    <ChooserSidebar onNavigate={() => setSheetOpen(false)} />
               </SheetContent>
          </Sheet>
     );
};

// ============================================================================
// MAIN FILE CHOOSER COMPONENT
// ============================================================================
export const DriveFileChooser = (props: Readonly<{
     value: TDriveFile | TDriveFile[] | null;
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
          value, onChange, multiple = false, accept, placeholder = 'Choose files...',
          className, disabled = false, error, helperText
     } = props;

     const { items, selectedFileIds, setSelectedFileIds, createUrl } = useDrive();
     const [isOpen, setIsOpen] = useState(false);

     // Sync selection on open
     useEffect(() => {
          if (isOpen) {
               if (!value) setSelectedFileIds([]);
               else if (Array.isArray(value)) setSelectedFileIds(value.map(f => f.id));
               else setSelectedFileIds([value.id]);
          }
     }, [isOpen, value, setSelectedFileIds]);

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
          <div className={cn("w-full", className)}>
               {/* Trigger Button */}
               {!hasSelection ? (
                    <Button
                         type="button"
                         variant="outline"
                         onClick={() => setIsOpen(true)}
                         disabled={disabled}
                         className={cn(
                              "w-full h-auto justify-start gap-3 px-3 py-2.5 border-dashed",
                              error && "border-destructive"
                         )}
                    >
                         <div className={cn(
                              "size-9 rounded-lg flex items-center justify-center shrink-0",
                              error ? "bg-destructive/10 text-destructive" : "bg-muted/50 text-muted-foreground"
                         )}>
                              <UploadIcon className="size-4" />
                         </div>
                         <div className="flex-1 min-w-0 text-left">
                              <p className={cn("text-sm font-medium", error && "text-destructive")}>
                                   {multiple ? "Select files" : "Select a file"}
                              </p>
                              <p className="text-xs text-muted-foreground font-normal truncate">{placeholder}</p>
                         </div>
                    </Button>
               ) : (
                    /* Selected Files Display */
                    <div className={cn("rounded-lg border", error ? "border-destructive" : "border-border", disabled && "opacity-50")}>
                         {!multiple && displayFiles[0] && (
                              <div className="flex items-center gap-3 p-2.5">
                                   <div className="size-12 rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center shrink-0">
                                        {displayFiles[0].file.mime.startsWith('image/') ? (
                                             <img src={createUrl(displayFiles[0], { quality: 'low', format: 'webp' })} alt={displayFiles[0].file.name} className="size-full object-cover" />
                                        ) : (
                                             getFileIcon(displayFiles[0].file.mime, false, "size-6 text-muted-foreground")
                                        )}
                                   </div>
                                   <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{displayFiles[0].file.name}</p>
                                        <p className="text-xs text-muted-foreground">{displayFiles[0].file.mime || 'File'}</p>
                                   </div>
                                   <div className="flex items-center gap-1 shrink-0">
                                        <Button type="button" variant="ghost" size="sm" onClick={() => setIsOpen(true)} disabled={disabled}>Change</Button>
                                        {!disabled && (
                                             <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => handleRemove(displayFiles[0].id)}>
                                                  <X className="size-4" />
                                             </Button>
                                        )}
                                   </div>
                              </div>
                         )}

                         {multiple && (
                              <>
                                   <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/20">
                                        <span className="text-xs text-muted-foreground font-medium">{displayFiles.length} file{displayFiles.length !== 1 ? 's' : ''} selected</span>
                                        <div className="flex items-center gap-1">
                                             <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setIsOpen(true)} disabled={disabled}>Add more</Button>
                                             {!disabled && <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => onChange([])}>Clear</Button>}
                                        </div>
                                   </div>
                                   <div className="max-h-40 overflow-y-auto divide-y divide-border/50">
                                        {displayFiles.map((file) => (
                                             <div key={file.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/20">
                                                  <div className="size-8 rounded overflow-hidden bg-muted/30 flex items-center justify-center shrink-0">
                                                       {file.file.mime.startsWith('image/') ? (
                                                            <img src={createUrl(file, { quality: 'ultralow', format: 'webp' })} alt={file.file.name} className="size-full object-cover" />
                                                       ) : (
                                                            getFileIcon(file.file.mime, false, "size-4 text-muted-foreground")
                                                       )}
                                                  </div>
                                                  <span className="flex-1 text-sm truncate">{file.file.name}</span>
                                                  {!disabled && (
                                                       <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => handleRemove(file.id)}>
                                                            <X className="size-3.5" />
                                                       </Button>
                                                  )}
                                             </div>
                                        ))}
                                   </div>
                              </>
                         )}
                    </div>
               )}

               {error && helperText && <p className="text-xs text-destructive mt-1.5">{helperText}</p>}

               {/* File Picker Dialog */}
               <Dialog2 open={isOpen} onOpenChange={setIsOpen}>
                    <Dialog2Content showCloseButton={false}>
                         {/* Header */}
                         <Dialog2Header className="gap-2">
                              <MobileSidebarSheet />
                              <Dialog2Title className="flex-1">Select {multiple ? 'Files' : 'File'}</Dialog2Title>
                              <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => setIsOpen(false)}>
                                   <X className="size-4" />
                              </Button>
                         </Dialog2Header>

                         {/* Body */}
                         <Dialog2Body className="flex flex-col md:flex-row">
                              {/* Sidebar - Desktop */}
                              <div className="hidden md:flex w-52 lg:w-56 border-r shrink-0">
                                   <ChooserSidebar />
                              </div>

                              {/* Main Content */}
                              <DriveDndProvider>
                                   <div className="flex-1 flex flex-col min-w-0 min-h-0">
                                        <DriveHeader className="border-b" />
                                        <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/20 dark:bg-muted/10">
                                             <DrivePathBar className="flex-1" />
                                             <DriveUpload compact accept={accept} />
                                        </div>
                                        <DriveFileGrid mimeFilter={accept} className="flex-1" />
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
