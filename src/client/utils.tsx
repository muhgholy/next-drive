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
export const getFileIcon = (mime: string, isFolder: boolean, className = "nd:w-6 nd:h-6"): ReactNode => {
    if (isFolder) return <Folder className={cn("nd:text-blue-500 nd:fill-blue-500/20", className)} />;
    if (mime.startsWith('image/')) return <Image className={cn("nd:text-purple-500", className)} />;
    if (mime.startsWith('video/')) return <Video className={cn("nd:text-red-500", className)} />;
    if (mime.startsWith('audio/')) return <Music className={cn("nd:text-yellow-500", className)} />;
    if (mime === 'application/pdf') return <FileText className={cn("nd:text-orange-500", className)} />;
    if (mime.includes('text') || mime.includes('document')) return <FileText className={cn("nd:text-slate-500", className)} />;
    if (mime.includes('zip') || mime.includes('compressed')) return <FileArchive className={cn("nd:text-amber-500", className)} />;
    if (mime.includes('javascript') || mime.includes('typescript') || mime.includes('json') || mime.includes('html') || mime.includes('css')) return <FileCode className={cn("nd:text-green-500", className)} />;
    return <File className={cn("nd:text-gray-400", className)} />;
};

// ** Check if file matches mime filter (supports native accept format)
// Supports: "image/*", "video/*", ".pdf", ".jpg,.png", "image/png,image/jpeg", etc.
export const matchesMimeFilter = (mime: string, isFolder: boolean, filter?: string): boolean => {
    if (!filter) return true;
    if (isFolder) return true;
    if (filter === '*/*' || filter === '*') return true;

    const types = filter.split(',').map(t => t.trim().toLowerCase());
    const lowerMime = mime.toLowerCase();

    return types.some(type => {
        // Exact mime match: "image/png"
        if (type === lowerMime) return true;

        // Wildcard mime: "image/*"
        if (type.endsWith('/*')) {
            const prefix = type.slice(0, -2);
            return lowerMime.startsWith(`${prefix}/`);
        }

        // Extension format: ".pdf", ".jpg"
        if (type.startsWith('.')) {
            const ext = type.slice(1);
            // Map common extensions to mimes
            const extMimeMap: Record<string, string[]> = {
                'jpg': ['image/jpeg'],
                'jpeg': ['image/jpeg'],
                'png': ['image/png'],
                'gif': ['image/gif'],
                'webp': ['image/webp'],
                'svg': ['image/svg+xml'],
                'bmp': ['image/bmp'],
                'ico': ['image/x-icon', 'image/vnd.microsoft.icon'],
                'tiff': ['image/tiff'],
                'tif': ['image/tiff'],
                'heic': ['image/heic'],
                'heif': ['image/heif'],
                'avif': ['image/avif'],
                'mp4': ['video/mp4'],
                'webm': ['video/webm'],
                'mov': ['video/quicktime'],
                'avi': ['video/x-msvideo'],
                'mkv': ['video/x-matroska'],
                'wmv': ['video/x-ms-wmv'],
                'flv': ['video/x-flv'],
                'mp3': ['audio/mpeg', 'audio/mp3'],
                'wav': ['audio/wav', 'audio/x-wav'],
                'ogg': ['audio/ogg'],
                'flac': ['audio/flac'],
                'aac': ['audio/aac'],
                'm4a': ['audio/mp4', 'audio/x-m4a'],
                'pdf': ['application/pdf'],
                'doc': ['application/msword'],
                'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
                'xls': ['application/vnd.ms-excel'],
                'xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
                'ppt': ['application/vnd.ms-powerpoint'],
                'pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
                'txt': ['text/plain'],
                'csv': ['text/csv'],
                'json': ['application/json'],
                'xml': ['application/xml', 'text/xml'],
                'zip': ['application/zip', 'application/x-zip-compressed'],
                'rar': ['application/x-rar-compressed', 'application/vnd.rar'],
                '7z': ['application/x-7z-compressed'],
                'tar': ['application/x-tar'],
                'gz': ['application/gzip'],
            };
            const allowedMimes = extMimeMap[ext];
            if (allowedMimes) {
                return allowedMimes.some(m => lowerMime === m);
            }
            // Fallback: check if mime ends with extension
            return lowerMime.includes(ext);
        }

        return false;
    });
};

// ** Get accept string for input element from filter
export const getAcceptString = (filter?: string): string | undefined => {
    if (!filter) return undefined;
    // Already in correct format for input accept
    return filter;
};

import type { TDriveFile } from '@/types/client';

// ** Create URL for drive file
export const driveCreateUrl = (driveFile: TDriveFile, apiEndpoint: string): string => {
    const params = new URLSearchParams({
        action: 'serve',
        id: driveFile.id,
    });

    return `${apiEndpoint}?${params.toString()}`;
};
