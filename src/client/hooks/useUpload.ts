// ** Upload Hook
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { TDriveUploadState } from '@/types/client';

// ** Constants
const MAX_CONCURRENT_UPLOADS = 2;

const getChunkSize = (fileSize: number) => {
    if (fileSize < 50 * 1024 * 1024) return 2 * 1024 * 1024;
    if (fileSize < 200 * 1024 * 1024) return 4 * 1024 * 1024;
    if (fileSize < 1024 * 1024 * 1024) return 8 * 1024 * 1024;
    return 16 * 1024 * 1024;
};

export const useUpload = (apiEndpoint: string, activeAccountId: string | null, withCredentials: boolean = false, onUploadComplete?: (item: unknown) => void) => {
    const [uploads, setUploads] = useState<TDriveUploadState[]>([]);
    const abortControllers = useRef<Map<string, AbortController>>(new Map());

    // ** Refs for data storage
    const filesRef = useRef<Map<string, File>>(new Map());
    const metaRef = useRef<Map<string, { folderId: string | null }>>(new Map());

    const updateUpload = useCallback((id: string, updates: Partial<TDriveUploadState>) => {
        setUploads(prev => prev.map(u => (u.id === id ? { ...u, ...updates } : u)));
    }, []);

    const addLog = useCallback((id: string, type: 'info' | 'warning' | 'error' | 'success', message: string) => {
        setUploads(prev => prev.map(u => {
            if (u.id !== id) return u;
            const logs = u.logs || [];
            return { ...u, logs: [...logs, { type, message, timestamp: Date.now() }] };
        }));
    }, []);

    const uploadChunk = async (uploadId: string, formData: FormData): Promise<[boolean, any, boolean]> => {
        try {
            const headers: Record<string, string> = {};
            if (activeAccountId) headers['x-drive-account'] = activeAccountId;
            const url = `${apiEndpoint.replace(/\/$/, '')}?action=upload`;
            addLog(uploadId, 'info', `Sending chunk to ${url}`);

            const response = await fetch(url, {
                method: 'POST',
                body: formData,
                headers,
                credentials: withCredentials ? 'include' : 'same-origin',
            });

            // Handle HTTP errors
            if (!response.ok) {
                const text = await response.text();
                addLog(uploadId, 'error', `HTTP ${response.status}: ${response.statusText}`);
                try {
                    const json = JSON.parse(text);
                    const msg = json.message || json.error?.message || `Status ${response.status}`;
                    addLog(uploadId, 'error', `Server response: ${msg}`);

                    // Retry on Gateway errors (502, 503, 504) or Request Timeout (408) or Too Many Requests (429)
                    const canRetry = [408, 429, 502, 503, 504].includes(response.status);
                    if (canRetry) {
                        addLog(uploadId, 'warning', `Error is retryable (status ${response.status})`);
                    }
                    return [false, msg, canRetry];
                } catch {
                    // If parsing fails, it's likely a severe server error (500 HTML) or network glitch response?
                    // Assume retryable for 5xx range, non-retryable for 4xx?
                    addLog(uploadId, 'error', `Failed to parse error response: ${text.slice(0, 100)}`);
                    const isRetryable = response.status >= 500 || response.status === 429;
                    return [false, `Server error ${response.status}: ${text.slice(0, 100)}`, isRetryable];
                }
            }

            const data = await response.json();
            if (data.status !== 200) {
                addLog(uploadId, 'error', `Upload API error: ${data.message || 'Unknown error'}`);
                return [false, data.message || 'Upload failed', false]; // Business logic errors are fatal
            }

            addLog(uploadId, 'success', `Chunk uploaded successfully`);
            return [true, data.data, false];
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Network error';
            addLog(uploadId, 'error', `Network/Fetch error: ${errorMsg}`);
            return [false, errorMsg, true]; // Network errors are retryable
        }
    };

    const processItem = async (item: TDriveUploadState, file: File, folderId: string | null) => {
        const controller = new AbortController();
        abortControllers.current.set(item.id, controller);

        addLog(item.id, 'info', `Starting upload: ${file.name} (${file.size} bytes)`);
        updateUpload(item.id, { status: 'uploading' });

        const chunkSize = getChunkSize(file.size);
        const totalChunks = Math.ceil(file.size / chunkSize);
        addLog(item.id, 'info', `File split into ${totalChunks} chunks of ${chunkSize} bytes each`);

        let driveId = item.driveId;

        try {
            for (let i = item.currentChunk; i < totalChunks; i++) {
                if (controller.signal.aborted) throw new Error('Cancelled');

                updateUpload(item.id, { currentChunk: i });
                addLog(item.id, 'info', `Processing chunk ${i + 1}/${totalChunks}`);

                const start = i * chunkSize;
                const end = Math.min(start + chunkSize, file.size);
                const chunk = file.slice(start, end);

                const formData = new FormData();
                formData.append('chunk', chunk);
                formData.append('chunkIndex', String(i));
                formData.append('totalChunks', String(totalChunks));
                formData.append('fileName', file.name);
                formData.append('fileSize', String(file.size));
                formData.append('fileType', file.type);
                formData.append('folderId', folderId || 'root');
                if (driveId) formData.append('driveId', driveId);

                // Smart retry logic
                let attempts = 0;
                let success = false;
                while (!success && attempts < 3 && !controller.signal.aborted) {
                    const [ok, result, canRetry] = await uploadChunk(item.id, formData);
                    if (ok) {
                        success = true;
                        if (result.type === 'UPLOAD_STARTED' && result.driveId) {
                            driveId = result.driveId;
                            updateUpload(item.id, { driveId });
                            addLog(item.id, 'success', `Upload session started with ID: ${driveId}`);
                        } else if (result.type === 'UPLOAD_COMPLETE') {
                            // Single chunk upload complete
                            addLog(item.id, 'success', `Upload completed successfully`);
                            if (onUploadComplete) onUploadComplete(result.item);
                        }
                    } else {
                        if (!canRetry) {
                            addLog(item.id, 'error', `Non-retryable error: ${result as string}`);
                            throw new Error(result as string); // Immediate failure for non-retryable errors
                        }

                        attempts++;
                        addLog(item.id, 'warning', `Retry attempt ${attempts}/3 after error`);
                        if (attempts === 3) {
                            addLog(item.id, 'error', `Max retry attempts reached: ${result as string}`);
                            throw new Error(result as string);
                        }
                        await new Promise(r => setTimeout(r, 1000 * attempts));
                    }
                }
            }
            addLog(item.id, 'success', `All ${totalChunks} chunks uploaded successfully`);
            updateUpload(item.id, { status: 'complete', currentChunk: totalChunks });
            // Since we don't get the item in the final chunk response here easily without parsing the loop result,
            // wait, the server returns UPLOAD_COMPLETE with item in the last chunk response.
            // But loop logic handles it?
            // "if (result.type === 'UPLOAD_COMPLETE')" is handled inside the loop for single files OR last chunk.
            // So onUploadComplete is called there.
            // Wait, chunked upload response handling loop (lines 96-103) ONLY handles UPLOAD_STARTED.
            // I need to update the loop to checks for UPLOAD_COMPLETE too.
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            if (errorMessage === 'Cancelled') {
                addLog(item.id, 'warning', 'Upload cancelled by user');
                updateUpload(item.id, { status: 'cancelled' });
            } else {
                addLog(item.id, 'error', `Upload failed: ${errorMessage}`);
                updateUpload(item.id, { status: 'error', error: errorMessage });
            }
        } finally {
            abortControllers.current.delete(item.id);
        }
    };

    const uploadFiles = useCallback(async (files: File[], folderId: string | null) => {
        const newUploads: TDriveUploadState[] = [];
        files.forEach(file => {
            const id = `upload_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const chunkSize = getChunkSize(file.size);
            filesRef.current.set(id, file);
            metaRef.current.set(id, { folderId });

            newUploads.push({
                id,
                name: file.name,
                size: file.size,
                status: 'queued',
                currentChunk: 0,
                totalChunks: Math.ceil(file.size / chunkSize),
                logs: [],
            });
        });

        setUploads(prev => [...prev, ...newUploads]);
    }, []);

    const cancelUpload = useCallback(
        async (id: string) => {
            const controller = abortControllers.current.get(id);
            if (controller) {
                controller.abort();
            } else {
                updateUpload(id, { status: 'cancelled' });
            }

            const upload = uploads.find(u => u.id === id);
            if (upload?.driveId) {
                fetch(`${apiEndpoint.replace(/\/$/, '')}?action=cancel&id=${upload.driveId}`, {
                    method: 'POST',
                    credentials: withCredentials ? 'include' : 'same-origin',
                }).catch(() => { });
            }
        },
        [apiEndpoint, updateUpload, uploads, withCredentials],
    );

    const cancelAllUploads = useCallback(async () => {
        uploads.forEach(u => {
            if (['queued', 'uploading', 'pending'].includes(u.status)) {
                cancelUpload(u.id);
            }
        });
    }, [uploads, cancelUpload]);

    // ** Robust Scheduler
    useEffect(() => {
        const activeCount = uploads.filter(u => u.status === 'uploading').length;

        if (activeCount >= MAX_CONCURRENT_UPLOADS) return;

        const queued = uploads.find(u => u.status === 'queued');

        if (queued) {
            const file = filesRef.current.get(queued.id);
            const meta = metaRef.current.get(queued.id);

            if (file) {
                processItem(queued, file, meta?.folderId || null);
            }
        }
        // eslint-disable-next-line
    }, [uploads]);

    return { uploads, uploadFiles, cancelUpload, cancelAllUploads };
};
