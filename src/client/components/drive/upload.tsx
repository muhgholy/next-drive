// ** Upload Component
'use client';

import React, { useState, useRef, useCallback } from 'react';
import type { TDatabaseDrive } from '@/types/server';
import { useDrive } from '@/client/context';
import { useUpload } from '@/client/hooks/useUpload';
import { Upload as UploadIcon, X, Loader2, CheckCircle2, AlertCircle, Clock, RefreshCw, FileText } from 'lucide-react';
import { cn, matchesMimeFilter } from '@/client/utils';
import { Button } from '@/client/components/ui/button';
import { Progress } from '@/client/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/client/components/ui/dialog';
import type { TDriveUploadState } from '@/types/client';

const UploadStatusIcon = (props: Readonly<{ status: TDriveUploadState['status'] }>) => {
    const { status } = props;

    switch (status) {
        case 'complete':
            return <CheckCircle2 className="nd-size-4 nd-text-emerald-500" />;
        case 'error':
            return <AlertCircle className="nd-size-4 nd-text-destructive" />;
        case 'cancelled':
            return <X className="nd-size-4 nd-text-muted-foreground" />;
        case 'uploading':
            return <Loader2 className="nd-size-4 nd-text-primary nd-animate-spin" />;
        default:
            return <Clock className="nd-size-4 nd-text-muted-foreground" />;
    }
};

const LogViewerDialog = (props: Readonly<{ upload: TDriveUploadState; open: boolean; onOpenChange: (open: boolean) => void }>) => {
    const { upload, open, onOpenChange } = props;
    const logs = upload.logs || [];

    const handleCopy = () => {
        const logText = logs.map(log => `[${new Date(log.timestamp).toLocaleTimeString()}] ${log.type.toUpperCase()}: ${log.message}`).join('\n');
        navigator.clipboard.writeText(logText);
    };

    const handleDownload = () => {
        const logText = logs.map(log => `[${new Date(log.timestamp).toLocaleTimeString()}] ${log.type.toUpperCase()}: ${log.message}`).join('\n');
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${upload.name}-logs.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:nd-max-w-lg nd-p-0 nd-gap-0 nd-max-h-[85vh] nd-flex nd-flex-col">
                <DialogHeader className="nd-px-4 nd-py-3 nd-border-b">
                    <DialogTitle className="nd-text-base nd-truncate">{upload.name}</DialogTitle>
                </DialogHeader>
                <div className="nd-sticky nd-top-0 nd-z-10 nd-bg-background nd-px-4 nd-py-2 nd-border-b nd-flex nd-items-center nd-gap-2">
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleCopy}
                        disabled={logs.length === 0}
                    >
                        Copy
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleDownload}
                        disabled={logs.length === 0}
                    >
                        Download
                    </Button>
                </div>
                <div className="nd-flex-1 nd-overflow-y-auto nd-p-4 nd-space-y-2">
                    {logs.length === 0 && (
                        <p className="nd-text-sm nd-text-muted-foreground nd-text-center nd-py-8">No logs available</p>
                    )}
                    {logs.map((log, index) => (
                        <div
                            key={index}
                            className={cn(
                                "nd-flex nd-items-start nd-gap-2 nd-p-2 nd-rounded-md nd-border nd-text-sm",
                                log.type === 'error' && "nd-bg-destructive/5 nd-border-destructive/20",
                                log.type === 'warning' && "nd-bg-yellow-500/5 nd-border-yellow-500/20",
                                log.type === 'success' && "nd-bg-emerald-500/5 nd-border-emerald-500/20",
                                log.type === 'info' && "nd-bg-muted/50 nd-border-border"
                            )}
                        >
                            <div className={cn(
                                "nd-shrink-0 nd-size-1.5 nd-rounded-full nd-mt-1.5",
                                log.type === 'error' && "nd-bg-destructive",
                                log.type === 'warning' && "nd-bg-yellow-500",
                                log.type === 'success' && "nd-bg-emerald-500",
                                log.type === 'info' && "nd-bg-muted-foreground"
                            )} />
                            <div className="nd-flex-1 nd-min-w-0 nd-space-y-1">
                                <p className="nd-break-words nd-whitespace-pre-wrap">{log.message}</p>
                                <p className="nd-text-xs nd-text-muted-foreground">
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export const DriveUpload = (props: Readonly<{
    compact?: boolean;
    onComplete?: (item: unknown) => void;
    accept?: string;
}>) => {
    // ** Deconstruct Props
    const { compact = false, onComplete, accept } = props;

    const [isDragging, setIsDragging] = useState(false);
    const [showUploadsDialog, setShowUploadsDialog] = useState(false);
    const [logViewerUpload, setLogViewerUpload] = useState<TDriveUploadState | null>(null);
    const [manuallyOpened, setManuallyOpened] = useState(false);
    const hasAutoClosedRef = useRef(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const { currentFolderId, setItems, apiEndpoint, activeAccountId, withCredentials, fetchItems, isLoading } = useDrive();
    const { uploads, uploadFiles, cancelUpload, cancelAllUploads } = useUpload(apiEndpoint, activeAccountId, withCredentials, (uploadedItem) => {
        // Optimistically add the uploaded item to the items list
        if (uploadedItem) {
            setItems(prev => [uploadedItem as TDatabaseDrive, ...prev]);
        }
        onComplete?.(uploadedItem);
    });

    // Auto-hide dialog when all uploads are finished (only once, and not if manually opened)
    React.useEffect(() => {
        if (!showUploadsDialog || uploads.length === 0 || manuallyOpened || hasAutoClosedRef.current) return;

        const allFinished = uploads.every(u =>
            ['complete', 'error', 'cancelled'].includes(u.status)
        );

        if (allFinished) {
            const timer = setTimeout(() => {
                setShowUploadsDialog(false);
                hasAutoClosedRef.current = true;
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [uploads, showUploadsDialog, manuallyOpened]);

    // Filter files based on accept prop
    const filterFiles = useCallback((files: File[]): File[] => {
        if (!accept) return files;
        return files.filter(file => matchesMimeFilter(file.type, false, accept));
    }, [accept]);

    const handleFiles = useCallback((files: FileList | null) => {
        if (!files || files.length === 0) return;
        const filteredFiles = filterFiles(Array.from(files));
        if (filteredFiles.length === 0) return;
        uploadFiles(filteredFiles, currentFolderId);
        setManuallyOpened(false);
        setShowUploadsDialog(true);
    }, [uploadFiles, currentFolderId, filterFiles]);

    const handleDrag = useCallback((e: React.DragEvent, dragging: boolean) => {
        e.preventDefault(); e.stopPropagation(); setIsDragging(dragging);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setIsDragging(false); handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    const hasUploadsInProgress = uploads.some(u => ['uploading', 'queued', 'pending'].includes(u.status));
    const activeUploads = uploads.filter(u => ['uploading', 'queued', 'pending'].includes(u.status));

    const renderDialog = () => (
        <Dialog open={showUploadsDialog} onOpenChange={setShowUploadsDialog}>
            <DialogContent className="sm:nd-max-w-md nd-p-0 nd-gap-0" showCloseButton={false}>
                <DialogHeader className="nd-px-4 nd-py-3 nd-border-b nd-flex-row nd-items-center nd-justify-between nd-space-y-0">
                    <DialogTitle className="nd-text-base">Upload Status</DialogTitle>
                    {hasUploadsInProgress && (
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="nd-text-destructive hover:nd-text-destructive"
                            onClick={cancelAllUploads}
                        >
                            Cancel All
                        </Button>
                    )}
                </DialogHeader>

                <div className="nd-divide-y nd-max-h-80 nd-overflow-y-auto">
                    {uploads.length === 0 && (
                        <div className="nd-p-4 nd-text-center nd-text-sm nd-text-muted-foreground">No uploads</div>
                    )}
                    {uploads.map((upload) => {
                        const percent = upload.status === 'complete' ? 100 : (upload.status === 'error' || !upload.totalChunks) ? 0 : Math.round((upload.currentChunk / upload.totalChunks) * 100);
                        return (
                            <div key={upload.id} className="nd-px-4 nd-py-2.5">
                                <div className="nd-flex nd-items-start nd-gap-2 nd-mb-1.5">
                                    <UploadStatusIcon status={upload.status} />
                                    <div className="nd-flex-1 nd-min-w-0">
                                        <p className="nd-text-sm nd-font-medium nd-truncate">{upload.name}</p>
                                        <p className={cn(
                                            "nd-text-xs nd-break-words",
                                            upload.status === 'error' ? "nd-text-destructive" : "nd-text-muted-foreground"
                                        )}>
                                            {upload.status === 'uploading' && 'Uploading...'}
                                            {upload.status === 'queued' && 'Waiting in queue'}
                                            {upload.status === 'pending' && 'Preparing...'}
                                            {upload.status === 'complete' && 'Upload complete'}
                                            {upload.status === 'error' && (upload.error || 'Upload failed')}
                                            {upload.status === 'cancelled' && 'Upload cancelled'}
                                        </p>
                                    </div>
                                    <div className="nd-flex nd-items-center nd-gap-1 nd-shrink-0">
                                        {(upload.logs && upload.logs.length > 0) && (
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                className="nd-text-muted-foreground hover:nd-text-foreground"
                                                onClick={() => setLogViewerUpload(upload)}
                                                title="View logs"
                                            >
                                                <FileText className="nd-size-3.5" />
                                            </Button>
                                        )}
                                        {['uploading', 'queued', 'pending'].includes(upload.status) && (
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                className="nd-text-muted-foreground hover:nd-text-destructive"
                                                onClick={() => cancelUpload(upload.id)}
                                                title="Cancel"
                                            >
                                                <X className="nd-size-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                {upload.status === 'uploading' && (
                                    <div className="nd-flex nd-items-center nd-gap-2 nd-pl-6">
                                        <Progress value={percent} className="nd-flex-1" />
                                        <span className="nd-text-xs nd-tabular-nums nd-text-muted-foreground nd-w-8">
                                            {percent}%
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </DialogContent>
        </Dialog>
    );

    if (compact) {
        return (
            <>
                {logViewerUpload && (
                    <LogViewerDialog
                        upload={logViewerUpload}
                        open={!!logViewerUpload}
                        onOpenChange={(open) => !open && setLogViewerUpload(null)}
                    />
                )}
                <div className="nd-flex nd-items-center nd-gap-2">
                    <input
                        ref={inputRef}
                        type="file"
                        multiple
                        accept={accept}
                        onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
                        className="nd-hidden"
                        aria-hidden="true"
                    />
                    {activeAccountId && (
                        <Button
                            onClick={() => fetchItems()}
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isLoading}
                            title="Refresh"
                        >
                            <RefreshCw className={cn("!nd-size-4 nd-shrink-0", isLoading && "nd-animate-spin")} />
                        </Button>
                    )}
                    <Button
                        onClick={() => inputRef.current?.click()}
                        type="button"
                        size="sm"
                        disabled={hasUploadsInProgress}
                    >
                        <UploadIcon className="!nd-size-4 nd-shrink-0" />
                        <span>Upload</span>
                    </Button>

                    {uploads.length > 0 && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => { setManuallyOpened(true); setShowUploadsDialog(true); }}
                        >
                            {activeUploads.length > 0 ? (
                                <Loader2 className="!nd-size-4 nd-shrink-0 nd-animate-spin" />
                            ) : (
                                <CheckCircle2 className="!nd-size-4 nd-shrink-0" />
                            )}
                            <span>
                                {activeUploads.length > 0
                                    ? `(${activeUploads.length})`
                                    : 'Status'
                                }
                            </span>
                        </Button>
                    )}
                </div>
                {renderDialog()}
            </>
        );
    }

    return (
        <div className="nd-w-full">
            <div
                className={cn(
                    "nd-flex nd-flex-col nd-items-center nd-justify-center nd-p-8 nd-border-2 nd-border-dashed nd-rounded-lg nd-cursor-pointer nd-transition-colors",
                    isDragging ? "nd-border-primary nd-bg-primary/5" : "nd-border-muted-foreground/25 hover:nd-border-primary/50 hover:nd-bg-muted/50"
                )}
                onDragEnter={(e) => handleDrag(e, true)} onDragLeave={(e) => handleDrag(e, false)} onDragOver={(e) => handleDrag(e, true)} onDrop={handleDrop}
                onClick={() => inputRef.current?.click()} role="button" tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
            >
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept={accept}
                    onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
                    className="nd-hidden"
                    aria-hidden="true"
                />
                <div className="nd-flex nd-flex-col nd-items-center nd-gap-2 nd-text-center">
                    <div className="nd-p-3 nd-rounded-full nd-bg-background nd-border nd-shadow-sm">
                        <UploadIcon className="nd-size-6 nd-text-muted-foreground" />
                    </div>
                    <div className="nd-text-sm nd-font-medium nd-text-foreground">
                        {isDragging ? 'Drop files here' : 'Click or drag files to upload'}
                    </div>
                </div>
            </div>

            {hasUploadsInProgress && (
                <div className="nd-mt-4 nd-text-center">
                    <Button variant="link" onClick={() => { setManuallyOpened(true); setShowUploadsDialog(true); }}>View Upload Progress</Button>
                </div>
            )}
            {renderDialog()}
            {logViewerUpload && (
                <LogViewerDialog
                    upload={logViewerUpload}
                    open={!!logViewerUpload}
                    onOpenChange={(open) => !open && setLogViewerUpload(null)}
                />
            )}
        </div>
    );
};
