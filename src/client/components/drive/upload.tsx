// ** Upload Component
'use client';

import React, { useState, useRef, useCallback } from 'react';
import type { TDatabaseDrive } from '@/types/server';
import { useDrive } from '@/client/context';
import { useUpload } from '@/client/hooks/useUpload';
import { Upload as UploadIcon, X, Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { cn, matchesMimeFilter } from '@/client/utils';
import { Button } from '@/client/components/ui/button';
import { Progress } from '@/client/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/client/components/ui/dialog';
import type { TDriveUploadState } from '@/types/client';

const UploadStatusIcon = ({ status }: { status: TDriveUploadState['status'] }) => {
    switch (status) {
        case 'complete':
            return <CheckCircle2 className="size-4 text-emerald-500" />;
        case 'error':
            return <AlertCircle className="size-4 text-destructive" />;
        case 'cancelled':
            return <X className="size-4 text-muted-foreground" />;
        case 'uploading':
            return <Loader2 className="size-4 text-primary animate-spin" />;
        default:
            return <Clock className="size-4 text-muted-foreground" />;
    }
};

export const DriveUpload = (props: Readonly<{
    compact?: boolean;
    onComplete?: (item: unknown) => void;
    accept?: string;
}>) => {
    const { compact = false, onComplete, accept } = props;
    const [isDragging, setIsDragging] = useState(false);
    const [showUploadsDialog, setShowUploadsDialog] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const { currentFolderId, setItems, apiEndpoint, activeAccountId, withCredentials } = useDrive();
    const { uploads, uploadFiles, cancelUpload, cancelAllUploads } = useUpload(apiEndpoint, activeAccountId, withCredentials, (uploadedItem) => {
        // Optimistically add the uploaded item to the items list
        if (uploadedItem) {
            setItems(prev => [uploadedItem as TDatabaseDrive, ...prev]);
        }
        onComplete?.(uploadedItem);
    });

    // Auto-hide dialog when all uploads are finished
    React.useEffect(() => {
        if (!showUploadsDialog || uploads.length === 0) return;

        const allFinished = uploads.every(u =>
            ['complete', 'error', 'cancelled'].includes(u.status)
        );

        if (allFinished) {
            const timer = setTimeout(() => {
                setShowUploadsDialog(false);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [uploads, showUploadsDialog]);

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
            <DialogContent className="sm:max-w-md p-0 gap-0" showCloseButton={false}>
                <DialogHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0">
                    <DialogTitle className="text-base">Upload Status</DialogTitle>
                    {hasUploadsInProgress && (
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={cancelAllUploads}
                        >
                            Cancel All
                        </Button>
                    )}
                </DialogHeader>

                <div className="divide-y max-h-80 overflow-y-auto">
                    {uploads.length === 0 && (
                        <div className="p-4 text-center text-sm text-muted-foreground">No uploads</div>
                    )}
                    {uploads.map((upload) => {
                        const percent = upload.status === 'complete' ? 100 : (upload.status === 'error' || !upload.totalChunks) ? 0 : Math.round((upload.currentChunk / upload.totalChunks) * 100);
                        return (
                            <div key={upload.id} className="px-4 py-2.5">
                                <div className="flex items-start gap-2 mb-1.5">
                                    <UploadStatusIcon status={upload.status} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{upload.name}</p>
                                        <p className={cn(
                                            "text-xs",
                                            upload.status === 'error' ? "text-destructive" : "text-muted-foreground"
                                        )}>
                                            {upload.status === 'uploading' && 'Uploading...'}
                                            {upload.status === 'queued' && 'Waiting in queue'}
                                            {upload.status === 'pending' && 'Preparing...'}
                                            {upload.status === 'complete' && 'Upload complete'}
                                            {upload.status === 'error' && (upload.error || 'Upload failed')}
                                            {upload.status === 'cancelled' && 'Upload cancelled'}
                                        </p>
                                    </div>
                                    {['uploading', 'queued', 'pending'].includes(upload.status) && (
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            className="shrink-0 text-muted-foreground hover:text-destructive"
                                            onClick={() => cancelUpload(upload.id)}
                                        >
                                            <X className="size-3.5" />
                                        </Button>
                                    )}
                                </div>
                                {upload.status === 'uploading' && (
                                    <div className="flex items-center gap-2 pl-6">
                                        <Progress value={percent} className="flex-1" />
                                        <span className="text-xs tabular-nums text-muted-foreground w-8">
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
                <div className="flex items-center gap-2">
                    <input
                        ref={inputRef}
                        type="file"
                        multiple
                        accept={accept}
                        onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
                        className="hidden"
                        aria-hidden="true"
                    />
                    <Button
                        onClick={() => inputRef.current?.click()}
                        type="button"
                        size="sm"
                        disabled={hasUploadsInProgress}
                    >
                        <UploadIcon className="size-4 mr-1.5" /> Upload
                    </Button>

                    {uploads.length > 0 && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowUploadsDialog(true)}
                        >
                            {activeUploads.length > 0 && (
                                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                            )}
                            {activeUploads.length > 0
                                ? `(${activeUploads.length})`
                                : 'Status'
                            }
                        </Button>
                    )}
                </div>
                {renderDialog()}
            </>
        );
    }

    return (
        <div className="w-full">
            <div
                className={cn(
                    "flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                    isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
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
                    className="hidden"
                    aria-hidden="true"
                />
                <div className="flex flex-col items-center gap-2 text-center">
                    <div className="p-3 rounded-full bg-background border shadow-sm">
                        <UploadIcon className="size-6 text-muted-foreground" />
                    </div>
                    <div className="text-sm font-medium text-foreground">
                        {isDragging ? 'Drop files here' : 'Click or drag files to upload'}
                    </div>
                </div>
            </div>

            {hasUploadsInProgress && (
                <div className="mt-4 text-center">
                    <Button variant="link" onClick={() => setShowUploadsDialog(true)}>View Upload Progress</Button>
                </div>
            )}
            {renderDialog()}
        </div>
    );
};
