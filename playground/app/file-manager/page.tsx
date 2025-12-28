'use client';

import {
    DriveProvider,
    DriveExplorer,
    DriveSidebar,
    DriveHeader
} from '@muhgholy/next-drive/client';

export default function DrivePage() {
    return (
        <DriveProvider apiEndpoint="/api/drive">
            <main className="flex h-screen w-screen flex-col bg-background text-foreground overflow-hidden">
                {/* Top Header */}
                <div className="h-14 border-b shrink-0 px-3 sm:px-4 flex items-center justify-between gap-2">
                    <h1 className="font-semibold text-base sm:text-lg truncate">My Cloud Drive</h1>
                    <div className="w-full max-w-xs sm:max-w-sm md:max-w-md">
                        <DriveHeader />
                    </div>
                </div>

                {/* Main Workspace */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Left Sidebar - Desktop Only */}
                    <div className="hidden lg:block w-64 xl:w-72 border-r bg-card/50 shrink-0">
                        <DriveSidebar />
                    </div>

                    {/* Main Content - Explorer (includes mobile menu) */}
                    <div className="flex-1 flex flex-col min-w-0">
                        <DriveExplorer />
                    </div>
                </div>
            </main>
        </DriveProvider>
    );
}
