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

import type { TDriveFile, TImageQuality, TImageFormat } from '@/types/client';

// ** Create URL for drive file with optional quality and format
export const driveCreateUrl = (
    driveFile: TDriveFile,
    apiEndpoint: string,
    options?: { quality?: TImageQuality; format?: TImageFormat }
): string => {
    const params = new URLSearchParams({
        action: 'serve',
        id: driveFile.id,
    });

    if (options?.quality) params.set('q', options.quality);
    if (options?.format) params.set('format', options.format);

    return `${apiEndpoint}?${params.toString()}`;
};

// ** Generate responsive image srcSet for drive file
export const driveCreateSrcSet = (
    driveFile: TDriveFile,
    apiEndpoint: string,
    format: TImageFormat = 'webp'
): { srcSet: string; sizes: string } => {
    const qualities: TImageQuality[] = ['ultralow', 'low', 'medium', 'high'];

    // ** Quality to width mapping for srcSet
    const qualityWidthMap: Record<TImageQuality, number> = {
        ultralow: 200,
        low: 400,
        medium: 800,
        high: 1200,
        normal: 1600,
    };

    // ** Create srcSet for different qualities
    const srcSet = qualities
        .map(quality => {
            const url = driveCreateUrl(driveFile, apiEndpoint, { quality, format });
            return `${url} ${qualityWidthMap[quality]}w`;
        })
        .join(', ');

    // ** Default sizes attribute for responsive images
    const sizes = '(max-width: 320px) 200px, (max-width: 480px) 400px, (max-width: 768px) 800px, 1200px';

    return { srcSet, sizes };
};
