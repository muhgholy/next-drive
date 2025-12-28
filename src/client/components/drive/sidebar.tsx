'use client';

import React from 'react';
import { useDrive } from '@/client/context';
import { cn } from '@/client/utils';
import { Button } from '@/client/components/ui/button';
import {
    Database, HardDrive, Plus, LogOut, Check,
    ChevronsUpDown, FolderOpen, Trash2, Menu
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
} from "@/client/components/ui/sheet";
import { DriveStorageIndicator } from '@/client/components/drive/storage/indicator';

// ** Sidebar Content Component (reusable for both desktop and mobile)
const SidebarContent = () => {
    const {
        accounts, activeAccountId, setActiveAccountId,
        callAPI, refreshAccounts, currentView, setCurrentView
    } = useDrive();

    const currentAccountName = activeAccountId
        ? accounts.find(a => a.id === activeAccountId)?.name || 'Unknown Account'
        : 'Local Storage';

    const currentAccountEmail = activeAccountId
        ? accounts.find(a => a.id === activeAccountId)?.email
        : 'On this device';

    return (
        <div className="w-full h-full flex flex-col bg-muted/10 border-r">
            {/* Account Switcher */}
            <div className="p-3 border-b">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between px-2 h-auto min-h-12 py-2 hover:bg-muted/50">
                            <div className="flex items-center gap-2 sm:gap-3 text-left min-w-0 flex-1">
                                <div className="size-8 sm:size-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                                    {activeAccountId ? <Database className="size-4" /> : <HardDrive className="size-4" />}
                                </div>
                                <div className="flex flex-col truncate min-w-0">
                                    <span className="text-sm font-semibold truncate">{currentAccountName}</span>
                                    <span className="text-xs text-muted-foreground truncate font-normal">{currentAccountEmail}</span>
                                </div>
                            </div>
                            <ChevronsUpDown className="size-4 text-muted-foreground shrink-0 opacity-50 ml-1" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-60" align="start">
                        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Switch Account</DropdownMenuLabel>

                        {/* Local Storage Option */}
                        <DropdownMenuItem onClick={() => setActiveAccountId(null)} className="gap-2">
                            <div className="flex items-center justify-center size-6 rounded bg-muted">
                                <HardDrive className="size-3.5" />
                            </div>
                            <div className="flex flex-col flex-1">
                                <span className="text-sm font-medium">Local Storage</span>
                            </div>
                            {activeAccountId === null && <Check className="size-3.5 text-primary" />}
                        </DropdownMenuItem>

                        {accounts.length > 0 && <DropdownMenuSeparator />}

                        {/* Connected Accounts */}
                        {accounts.map(account => (
                            <DropdownMenuItem key={account.id} onClick={() => setActiveAccountId(account.id)} className="gap-2 group">
                                <div className="flex items-center justify-center size-6 rounded bg-muted">
                                    <Database className="size-3.5" />
                                </div>
                                <div className="flex flex-col flex-1 overflow-hidden">
                                    <span className="text-sm font-medium truncate">{account.name}</span>
                                    <span className="text-xs text-muted-foreground truncate">{account.email}</span>
                                </div>
                                {activeAccountId === account.id ? (
                                    <Check className="size-3.5 text-primary" />
                                ) : (
                                    <LogOut
                                        className="size-3.5 text-destructive transition-opacity hover:bg-destructive/10 rounded-sm"
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            if (confirm('Are you sure you want to disconnect this account? Synced files will be deleted from local cache.')) {
                                                await callAPI('removeAccount', { query: { id: account.id } });
                                                await refreshAccounts();
                                                if (activeAccountId === account.id) setActiveAccountId(null);
                                            }
                                        }}
                                    />
                                )}
                            </DropdownMenuItem>
                        ))}

                        <DropdownMenuSeparator />
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="gap-2 text-primary focus:text-primary">
                                <Plus className="size-4" />
                                <span className="font-medium">Add Storage Account</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                <DropdownMenuItem onClick={async () => {
                                    const res = await callAPI<{ url: string }>('getAuthUrl', { query: { provider: 'GOOGLE' } });
                                    if (res.status !== 200 || !res.data?.url) {
                                        alert(res.message || 'Failed to initialize account connection');
                                        return;
                                    }
                                    if (res.status === 200 && res.data?.url) {
                                        const width = 600;
                                        const height = 600;
                                        const left = window.screen.width / 2 - width / 2;
                                        const top = window.screen.height / 2 - height / 2;
                                        window.open(
                                            res.data.url,
                                            'Connect to Google Drive',
                                            `width=${width},height=${height},top=${top},left=${left}`
                                        );
                                        const listener = (event: MessageEvent) => {
                                            if (event.data === 'oauth-success') {
                                                refreshAccounts();
                                                window.removeEventListener('message', listener);
                                            }
                                        };
                                        window.addEventListener('message', listener);
                                    }
                                }}>
                                    Google Drive
                                </DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Navigation */}
            <div className="flex-1 px-3 py-2 space-y-1">
                <Button
                    variant={currentView !== 'TRASH' ? "secondary" : "ghost"}
                    className={cn("w-full justify-start gap-3", currentView !== 'TRASH' && "bg-primary/10 text-primary hover:bg-primary/15")}
                    onClick={() => setCurrentView('BROWSE')}
                >
                    <FolderOpen className="size-4" />
                    My Files
                </Button>
                <Button
                    variant={currentView === 'TRASH' ? "secondary" : "ghost"}
                    className={cn("w-full justify-start gap-3", currentView === 'TRASH' && "bg-destructive/10 text-destructive hover:bg-destructive/15")}
                    onClick={() => setCurrentView('TRASH')}
                >
                    <Trash2 className="size-4" />
                    Trash
                </Button>
            </div>

            {/* Storage */}
            <div className="px-3 py-2.5 mt-auto border-t bg-background/50">
                <DriveStorageIndicator />
            </div>
        </div>
    );
};

// ** Desktop Sidebar (always visible on larger screens)
export const DriveSidebar = () => {
    return (
        <>
            {/* Mobile: Hamburger Menu + Sheet */}
            <div className="lg:hidden">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            aria-label="Open menu"
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-70 sm:w-80 p-0">
                        <SidebarContent />
                    </SheetContent>
                </Sheet>
            </div>

            {/* Desktop: Always visible sidebar */}
            <div className="hidden lg:flex w-full h-full">
                <SidebarContent />
            </div>
        </>
    );
};
