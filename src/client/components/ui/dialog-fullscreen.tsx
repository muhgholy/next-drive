"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/client/utils"

// ** Dialog2 - Modern fullscreen dialog on mobile, centered on desktop
function Dialog2({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
    return <DialogPrimitive.Root data-slot="dialog2" {...props} />
}

function Dialog2Trigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
    return <DialogPrimitive.Trigger data-slot="dialog2-trigger" {...props} />
}

function Dialog2Close({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
    return <DialogPrimitive.Close data-slot="dialog2-close" {...props} />
}

function Dialog2Content({
    className,
    children,
    showCloseButton = true,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
    showCloseButton?: boolean
}) {
    return (
        <DialogPrimitive.Portal data-slot="dialog2-portal">
            {/* Overlay with higher z-index for proper stacking */}
            <DialogPrimitive.Overlay
                data-slot="dialog2-overlay"
                className={cn(
                    "nd:fixed nd:inset-0 nd:z-50 nd:bg-black/60 nd:backdrop-blur-sm",
                    "nd:data-[state=open]:animate-in nd:data-[state=closed]:animate-out",
                    "nd:data-[state=closed]:fade-out-0 nd:data-[state=open]:fade-in-0"
                )}
            />
            {/* Content: Fullscreen on mobile, centered modal on desktop */}
            <DialogPrimitive.Content
                data-slot="dialog2-content"
                className={cn(
                    "nd:overflow-hidden",

                    // Base styles
                    "nd:fixed nd:z-50 nd:flex nd:flex-col nd:bg-background nd:shadow-2xl nd:outline-none",
                    // Mobile: Full screen
                    "nd:inset-0 nd:rounded-none",
                    // Desktop: Centered modal with max dimensions
                    "nd:md:inset-auto nd:md:top-[50%] nd:md:left-[50%] nd:md:translate-x-[-50%] nd:md:translate-y-[-50%]",
                    "nd:md:max-w-5xl nd:md:w-[95vw] nd:md:max-h-[90vh] nd:md:rounded-xl nd:md:border",
                    // Animations
                    "nd:data-[state=open]:animate-in nd:data-[state=closed]:animate-out",
                    "nd:data-[state=closed]:fade-out-0 nd:data-[state=open]:fade-in-0",
                    "nd:data-[state=closed]:slide-out-to-bottom-2 nd:data-[state=open]:slide-in-from-bottom-2",
                    "nd:md:data-[state=closed]:zoom-out-95 nd:md:data-[state=open]:zoom-in-95",
                    "nd:md:data-[state=closed]:slide-out-to-bottom-0 nd:md:data-[state=open]:slide-in-from-bottom-0",
                    "nd:duration-200",
                    className
                )}
                {...props}
            >
                {children}
                {showCloseButton && (
                    <DialogPrimitive.Close
                        data-slot="dialog2-close"
                        className={cn(
                            "nd:absolute nd:top-3 nd:right-3 nd:z-10",
                            "nd:flex nd:items-center nd:justify-center nd:size-8 nd:rounded-full",
                            "nd:bg-muted/80 nd:hover:bg-muted nd:text-muted-foreground nd:hover:text-foreground",
                            "nd:transition-colors nd:focus:outline-none nd:focus:ring-2 nd:focus:ring-ring nd:focus:ring-offset-2",
                            "nd:md:top-4 nd:md:right-4 nd:md:size-7 nd:md:rounded-md nd:md:bg-transparent"
                        )}
                    >
                        <X className="nd:size-4" />
                        <span className="nd:sr-only">Close</span>
                    </DialogPrimitive.Close>
                )}
            </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
    )
}

function Dialog2Header({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="dialog2-header"
            className={cn(
                "nd:flex nd:items-center nd:justify-between nd:shrink-0 nd:px-4 nd:h-14 nd:border-b nd:bg-background/95 nd:backdrop-blur-sm",
                className
            )}
            {...props}
        />
    )
}

function Dialog2Body({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="dialog2-body"
            className={cn("nd:flex-1 nd:min-h-0 nd:overflow-hidden", className)}
            {...props}
        />
    )
}

function Dialog2Footer({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="dialog2-footer"
            className={cn(
                "nd:flex nd:items-center nd:justify-end nd:gap-2 nd:shrink-0 nd:px-4 nd:py-3 nd:border-t nd:bg-background/95 nd:backdrop-blur-sm",
                className
            )}
            {...props}
        />
    )
}

function Dialog2Title({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
    return (
        <DialogPrimitive.Title
            data-slot="dialog2-title"
            className={cn("nd:text-base nd:font-semibold", className)}
            {...props}
        />
    )
}

function Dialog2Description({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
    return (
        <DialogPrimitive.Description
            data-slot="dialog2-description"
            className={cn("nd:text-sm nd:text-muted-foreground", className)}
            {...props}
        />
    )
}

export {
    Dialog2,
    Dialog2Close,
    Dialog2Content,
    Dialog2Body,
    Dialog2Description,
    Dialog2Footer,
    Dialog2Header,
    Dialog2Title,
    Dialog2Trigger,
}
