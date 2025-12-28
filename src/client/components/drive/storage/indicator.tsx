// ** DriveStorageIndicator Component
'use client';

import React, { useEffect } from 'react';
import { useDrive } from '@/client/context';
import { formatBytes, cn } from '@/client/utils';
import { Progress } from '@/client/components/ui/progress';
import { Cloud, AlertCircle } from 'lucide-react';

export const DriveStorageIndicator = (props: Readonly<{ compact?: boolean; className?: string }>) => {
    const { compact = false, className } = props;
    const { quota, refreshQuota } = useDrive();

    useEffect(() => { refreshQuota(); }, []);

    if (!quota) return null;
    const { usedInBytes, totalInBytes, percentage } = quota;

    const isNearFull = percentage >= 90;
    const isFull = percentage >= 100;

    const stateColor = isFull ? "text-destructive" : isNearFull ? "text-yellow-600 dark:text-yellow-500" : "text-primary";
    const solidColor = isFull ? "bg-destructive" : isNearFull ? "bg-yellow-500" : "bg-primary";

    if (compact) {
        return (
            <div className={cn("flex items-center gap-3 text-xs font-medium text-muted-foreground", className)}>
                <span className="shrink-0 flex items-center gap-1.5">
                    <Cloud className="size-3.5" />
                    Storage
                </span>
                <Progress value={percentage} indicatorClassName={cn("bg-gradient-to-r from-blue-500 to-cyan-500", isNearFull && "from-yellow-500 to-orange-500", isFull && "bg-destructive")} className="w-24 sm:w-32" />
                <span className="shrink-0 whitespace-nowrap">{formatBytes(usedInBytes)} / {formatBytes(totalInBytes)}</span>
            </div>
        );
    }

    return (
        <>
            <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                    <Cloud className={cn("size-4", stateColor)} />
                    <span className="text-xs font-medium text-muted-foreground">Storage</span>
                </div>
                <span className="text-xs font-semibold tabular-nums">
                    {percentage}%
                </span>
            </div>

            <Progress
                value={percentage}
                className="h-1.5"
                indicatorClassName={cn(
                    "transition-all duration-500",
                    isFull ? "bg-destructive" : isNearFull ? "bg-yellow-500" : "bg-gradient-to-r from-blue-500 to-purple-500"
                )}
            />

            <div className="flex justify-between items-center mt-1.5">
                <span className="text-[10px] text-muted-foreground tabular-nums">
                    {formatBytes(usedInBytes)}
                </span>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                    {formatBytes(totalInBytes)}
                </span>
            </div>

            {isNearFull && (
                <div className={cn(
                    "flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-md mt-2",
                    isFull ? "bg-destructive/10 text-destructive" : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500"
                )}>
                    <AlertCircle className="size-3 shrink-0" />
                    <span>{isFull ? "Storage full" : "Almost full"}</span>
                </div>
            )}
        </>
    );
};
