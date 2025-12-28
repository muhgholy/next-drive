// ** Drive File Details Component
'use client';

import React from 'react';
import { TDatabaseDrive } from '@/types/server';
import { formatBytes } from '@/client/utils';
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from "@/client/components/ui/sheet";
import { Copy, FileText, Calendar, HardDrive, Hash, Film, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/client/components/ui/button';
import { Separator } from '@/client/components/ui/separator';

export const DriveFileDetails = (props: Readonly<{
    item: TDatabaseDrive | null;
    isOpen: boolean;
    onClose: () => void;
    apiEndpoint: string;
}>) => {
    // ** Deconstruct Props
    const { item, isOpen, onClose, apiEndpoint } = props;

    if (!item) return null;

    const isFile = item.information.type === 'FILE';
    const isFolder = item.information.type === 'FOLDER';

    const tokenParam = item.token ? `&token=${item.token}` : '';
    const thumbnailUrl = `${apiEndpoint}?action=thumbnail&id=${item.id}&size=medium${tokenParam}`;
    const fileUrl = `${apiEndpoint}?action=serve&id=${item.id}${tokenParam}`;

    const DetailItem = ({ icon: Icon, label, value }: { icon: any, label: string, value: string | React.ReactNode }) => (
        <div className="flex items-start gap-3 py-3">
            <Icon className="size-4 text-muted-foreground mt-0.5" />
            <div className="flex-1 space-y-0.5">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <div className="text-sm text-foreground break-all">{value}</div>
            </div>
        </div>
    );

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-[90%] sm:max-w-md overflow-y-auto">
                <SheetHeader className="pb-4">
                    <SheetTitle>Details</SheetTitle>
                    <SheetDescription>View information about this item.</SheetDescription>
                </SheetHeader>

                <div className="space-y-6">
                    {/* Preview */}
                    <div className="flex flex-col items-center p-6 bg-muted/20 rounded-lg border">
                        {item.information.type === 'FILE' && (item.information.mime.startsWith('image/') || item.information.mime.startsWith('video/')) ? (
                            <div className="aspect-video w-full rounded-md overflow-hidden bg-background border shadow-sm flex items-center justify-center">
                                <img src={thumbnailUrl} alt={item.name} className="object-contain size-full" />
                            </div>
                        ) : (
                            <div className="size-20 bg-muted rounded-full flex items-center justify-center">
                                <FileText className="size-10 text-muted-foreground" />
                            </div>
                        )}
                        <h3 className="mt-4 font-medium text-center break-all">{item.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                            {item.information.type === 'FOLDER' ? 'Folder' : item.information.mime}
                        </p>
                    </div>

                    <Separator />

                    {/* Metadata */}
                    <div className="space-y-1">
                        <DetailItem icon={HardDrive} label="Size" value={item.information.type === 'FOLDER' ? '-' : formatBytes(item.information.sizeInBytes)} />
                        <DetailItem icon={Calendar} label="Created" value={new Date(item.createdAt).toLocaleString()} />
                        {item.information.type === 'FILE' && (
                            <>
                                <DetailItem icon={FileText} label="Type" value={item.information.mime} />
                                {item.information.width && (
                                    <DetailItem icon={ImageIcon} label="Dimensions" value={`${item.information.width} x ${item.information.height}`} />
                                )}
                                {item.information.duration && (
                                    <DetailItem icon={Film} label="Duration" value={`${Math.round(item.information.duration)}s`} />
                                )}
                                {item.information.hash && (
                                    <DetailItem icon={Hash} label="Hash (SHA-256)" value={<span className="font-mono text-xs">{item.information.hash.substring(0, 16)}...</span>} />
                                )}
                            </>
                        )}
                    </div>

                    <Separator />

                    <div className="flex gap-2">
                        {item.information.type === 'FILE' && (
                            <Button className="w-full" variant="outline" onClick={() => window.open(fileUrl, '_blank')}>
                                Download / View
                            </Button>
                        )}
                        <Button className="w-full" variant="secondary" onClick={() => {
                            navigator.clipboard.writeText(item.id);
                        }}>
                            <Copy className="mr-2 size-3.5" /> Copy ID
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};
