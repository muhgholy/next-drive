"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/client/utils"

function TooltipProvider({
    delayDuration = 0,
    ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
    return (
        <TooltipPrimitive.Provider
            data-slot="tooltip-provider"
            delayDuration={delayDuration}
            {...props}
        />
    )
}

function Tooltip({
    ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
    return (
        <TooltipProvider>
            <TooltipPrimitive.Root data-slot="tooltip" {...props} />
        </TooltipProvider>
    )
}

function TooltipTrigger({
    ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
    return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
    className,
    sideOffset = 0,
    children,
    ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
    return (
        <TooltipPrimitive.Portal>
            <TooltipPrimitive.Content
                data-slot="tooltip-content"
                sideOffset={sideOffset}
                className={cn(
                    "nd-bg-foreground nd-text-background nd-animate-in nd-fade-in-0 nd-zoom-in-95 data-[state=closed]:nd-animate-out data-[state=closed]:nd-fade-out-0 data-[state=closed]:nd-zoom-out-95 data-[side=bottom]:nd-slide-in-from-top-2 data-[side=left]:nd-slide-in-from-right-2 data-[side=right]:nd-slide-in-from-left-2 data-[side=top]:nd-slide-in-from-bottom-2 nd-z-50 nd-w-fit nd-origin-(--radix-tooltip-content-transform-origin) nd-rounded-md nd-px-3 nd-py-1.5 nd-text-xs nd-text-balance",
                    className
                )}
                {...props}
            >
                {children}
                <TooltipPrimitive.Arrow className="nd-bg-foreground nd-fill-foreground nd-z-50 nd-size-2.5 nd-translate-y-[calc(-50%_-_2px)] nd-rotate-45 nd-rounded-[2px]" />
            </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
    )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
