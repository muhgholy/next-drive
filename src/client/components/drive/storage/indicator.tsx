// ** DriveStorageIndicator Component
'use client';

import React, { useEffect } from 'react';
import { useDrive } from '@/client/context';
import { formatBytes, cn } from '@/client/utils';
import { Progress } from '@/client/components/ui/progress';
import { Cloud, AlertCircle } from 'lucide-react';

export const DriveStorageIndicator = (props: Readonly<{ compact?: boolean; className?: string }>) => {
    // ** Deconstruct Props
    const { compact = false, className } = props;

    const { quota, refreshQuota } = useDrive();

    useEffect(() => { refreshQuota(); }, []);

    if (!quota) return null;
    const { usedInBytes, totalInBytes, percentage } = quota;

    const isNearFull = percentage >= 90;
    const isFull = percentage >= 100;

    const stateColor = isFull ? "nd:text-destructive" : isNearFull ? "nd:text-yellow-600 nd:dark:text-yellow-500" : "nd:text-primary";
    const solidColor = isFull ? "nd:bg-destructive" : isNearFull ? "nd:bg-yellow-500" : "nd:bg-primary";

    if (compact) {
        return (
            <div className={cn("nd:flex nd:items-center nd:gap-3 nd:text-xs nd:font-medium nd:text-muted-foreground", className)}>
                <span className="nd:shrink-0 nd:flex nd:items-center nd:gap-1.5">
                    <Cloud className="nd:size-3.5" />
                    Storage
                </span>
                <Progress value={percentage} indicatorClassName={cn("nd:bg-gradient-to-r nd:from-blue-500 nd:to-cyan-500", isNearFull && "nd:from-yellow-500 nd:to-orange-500", isFull && "nd:bg-destructive")} className="nd:w-24 nd:sm:w-32" />
                <span className="nd:shrink-0 nd:whitespace-nowrap">{formatBytes(usedInBytes)} / {formatBytes(totalInBytes)}</span>
            </div>
        );
    }

    return (
        <>
            <div className="nd:flex nd:items-center nd:justify-between nd:gap-2 nd:mb-2">
                <div className="nd:flex nd:items-center nd:gap-2">
                    <Cloud className={cn("nd:size-4", stateColor)} />
                    <span className="nd:text-xs nd:font-medium nd:text-muted-foreground">Storage</span>
                </div>
                <span className="nd:text-xs nd:font-semibold nd:tabular-nums">
                    {percentage}%
                </span>
            </div>

            <Progress
                value={percentage}
                className="nd:h-1.5"
                indicatorClassName={cn(
                    "nd:transition-all nd:duration-500",
                    isFull ? "nd:bg-destructive" : isNearFull ? "nd:bg-yellow-500" : "nd:bg-gradient-to-r nd:from-blue-500 nd:to-purple-500"
                )}
            />

            <div className="nd:flex nd:justify-between nd:items-center nd:mt-1.5">
                <span className="nd:text-[10px] nd:text-muted-foreground nd:tabular-nums">
                    {formatBytes(usedInBytes)}
                </span>
                <span className="nd:text-[10px] nd:text-muted-foreground nd:tabular-nums">
                    {formatBytes(totalInBytes)}
                </span>
            </div>

            {isNearFull && (
                <div className={cn(
                    "nd:flex nd:items-center nd:gap-1.5 nd:text-[10px] nd:font-medium nd:px-2 nd:py-1 nd:rounded-md nd:mt-2",
                    isFull ? "nd:bg-destructive/10 nd:text-destructive" : "nd:bg-yellow-500/10 nd:text-yellow-600 nd:dark:text-yellow-500"
                )}>
                    <AlertCircle className="nd:size-3 nd:shrink-0" />
                    <span>{isFull ? "Storage full" : "Almost full"}</span>
                </div>
            )}
        </>
    );
};
