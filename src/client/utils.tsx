// ** Client Utils
import React from 'react';
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// ** Format bytes to human readable string
export const formatBytes = (bytes: number, decimals = 2): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

import type { ReactNode } from 'react';
import { File, Folder, Image, Video, Music, FileText, Package, FileCode, FileArchive } from 'lucide-react';

// ** Get file icon based on mime type
export const getFileIcon = (mime: string, isFolder: boolean, className = "w-6 h-6"): ReactNode => {
    if (isFolder) return <Folder className={cn("text-blue-500 fill-blue-500/20", className)} />;
    if (mime.startsWith('image/')) return <Image className={cn("text-purple-500", className)} />;
    if (mime.startsWith('video/')) return <Video className={cn("text-red-500", className)} />;
    if (mime.startsWith('audio/')) return <Music className={cn("text-yellow-500", className)} />;
    if (mime === 'application/pdf') return <FileText className={cn("text-orange-500", className)} />;
    if (mime.includes('text') || mime.includes('document')) return <FileText className={cn("text-slate-500", className)} />;
    if (mime.includes('zip') || mime.includes('compressed')) return <FileArchive className={cn("text-amber-500", className)} />;
    if (mime.includes('javascript') || mime.includes('typescript') || mime.includes('json') || mime.includes('html') || mime.includes('css')) return <FileCode className={cn("text-green-500", className)} />;
    return <File className={cn("text-gray-400", className)} />;
};

// ** Check if file matches mime filter
export const matchesMimeFilter = (mime: string, isFolder: boolean, filter?: string): boolean => {
    if (!filter) return true;
    if (isFolder) return true;
    if (filter === '*/*') return true;

    const types = filter.split(',').map(t => t.trim());
    return types.some(type => {
        if (type === mime) return true;
        if (type.endsWith('/*')) {
            const prefix = type.slice(0, -2);
            return mime.startsWith(`${prefix}/`);
        }
        return false;
    });
};
