// ** FilePreview Component
'use client';

import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { TDatabaseDrive } from '@/types/server';
import { useDrive } from '@/client/context';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/client/components/ui/dialog';
import { Button } from '@/client/components/ui/button';

if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
}

export const DriveFilePreview = (props: Readonly<{ item: TDatabaseDrive; onClose: () => void }>) => {
    const { item, onClose } = props;
    const { apiEndpoint } = useDrive();
    const [pdfNumPages, setPdfNumPages] = useState<number | null>(null);

    if (item.information.type === 'FOLDER') return null;

    const mime = item.information.mime;
    const tokenParam = item.token ? `&token=${item.token}` : '';
    const fileUrl = `${apiEndpoint}?action=serve&id=${item.id}${tokenParam}`;

    const renderContent = () => {
        if (mime.startsWith('image/')) return <img src={fileUrl} alt={item.name} className="max-w-full max-h-[70vh] rounded-md object-contain shadow-sm" />;
        if (mime.startsWith('video/')) return <video src={fileUrl} controls autoPlay className="max-w-full max-h-[70vh] rounded-md shadow-sm bg-black">Your browser does not support video playback.</video>;
        if (mime.startsWith('audio/')) return (
            <div className="flex flex-col items-center gap-6 py-8 px-4 w-full">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-4xl">🎵</span>
                </div>
                <div className="text-center space-y-1">
                    <h4 className="font-medium text-lg">{item.name}</h4>
                    <p className="text-sm text-muted-foreground">{mime}</p>
                </div>
                <audio src={fileUrl} controls autoPlay className="w-full max-w-md mt-2">Your browser does not support audio playback.</audio>
            </div>
        );
        if (mime === 'application/pdf') {
            return (
                <div className="max-h-[70vh] overflow-y-auto rounded-md border bg-white dark:bg-zinc-900 mx-auto w-full">
                    <Document file={fileUrl} onLoadSuccess={({ numPages }) => setPdfNumPages(numPages)} className="flex flex-col items-center gap-4 p-4">
                        {pdfNumPages && Array.from(new Array(Math.min(pdfNumPages, 10)), (_, index) => (
                            <Page
                                key={`page_${index + 1}`}
                                pageNumber={index + 1}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                                className="shadow-md"
                                width={600}
                            />
                        ))}
                    </Document>
                    {pdfNumPages && pdfNumPages > 10 && (
                        <div className="p-4 text-center text-sm text-muted-foreground border-t bg-muted/20">
                            Showing 10 of {pdfNumPages} pages (Preview limited)
                        </div>
                    )}
                </div>
            );
        }
        return (
            <div className="flex flex-col items-center justify-center gap-6 py-12">
                <div className="p-4 rounded-full bg-muted">
                    <span className="text-4xl opacity-50">📄</span>
                </div>
                <div className="text-center space-y-2">
                    <h4 className="font-medium">Preview not available</h4>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                        This file type usually cannot be previewed in the browser.
                    </p>
                </div>
                <Button asChild>
                    <a href={fileUrl} download={item.name}>Download File</a>
                </Button>
            </div>
        );
    };

    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col gap-0 p-0">
                <DialogHeader className="px-4 py-3 border-b shrink-0 flex flex-row items-center justify-between">
                    <DialogTitle className="truncate pr-8">{item.name}</DialogTitle>
                </DialogHeader>
                <div className="p-6 overflow-auto flex items-center justify-center bg-muted/5 min-h-75 flex-1">
                    {renderContent()}
                </div>
            </DialogContent>
        </Dialog>
    );
};
