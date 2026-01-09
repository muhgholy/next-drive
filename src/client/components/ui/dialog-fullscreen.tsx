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
                    "nd-fixed nd-inset-0 nd-z-50 nd-bg-black/60 nd-backdrop-blur-sm",
                    "data-[state=open]:nd-animate-in data-[state=closed]:nd-animate-out",
                    "data-[state=closed]:nd-fade-out-0 data-[state=open]:nd-fade-in-0"
                )}
            />
            {/* Content: Fullscreen on mobile, centered modal on desktop */}
            <DialogPrimitive.Content
                data-slot="dialog2-content"
                className={cn(
                    // Base styles
                    "nd-fixed nd-z-50 nd-flex nd-flex-col nd-bg-background nd-shadow-2xl nd-outline-none",
                    // Mobile: Full screen
                    "nd-inset-0 nd-rounded-none",
                    // Desktop: Centered modal with max dimensions
                    "md:nd-inset-auto md:nd-top-[50%] md:nd-left-[50%] md:nd-translate-x-[-50%] md:nd-translate-y-[-50%]",
                    "md:nd-max-w-5xl md:nd-w-[95vw] md:nd-max-h-[90vh] md:nd-rounded-xl md:nd-border",
                    // Animations
                    "data-[state=open]:nd-animate-in data-[state=closed]:nd-animate-out",
                    "data-[state=closed]:nd-fade-out-0 data-[state=open]:nd-fade-in-0",
                    "data-[state=closed]:nd-slide-out-to-bottom-2 data-[state=open]:nd-slide-in-from-bottom-2",
                    "md:data-[state=closed]:nd-zoom-out-95 md:data-[state=open]:nd-zoom-in-95",
                    "md:data-[state=closed]:nd-slide-out-to-bottom-0 md:data-[state=open]:nd-slide-in-from-bottom-0",
                    "nd-duration-200",
                    className
                )}
                {...props}
            >
                {children}
                {showCloseButton && (
                    <DialogPrimitive.Close
                        data-slot="dialog2-close"
                        className={cn(
                            "nd-absolute nd-top-3 nd-right-3 nd-z-10",
                            "nd-flex nd-items-center nd-justify-center nd-size-8 nd-rounded-full",
                            "nd-bg-muted/80 hover:nd-bg-muted nd-text-muted-foreground hover:nd-text-foreground",
                            "nd-transition-colors focus:nd-outline-none focus:nd-ring-2 focus:nd-ring-ring focus:nd-ring-offset-2",
                            "md:nd-top-4 md:nd-right-4 md:nd-size-7 md:nd-rounded-md md:nd-bg-transparent"
                        )}
                    >
                        <X className="nd-size-4" />
                        <span className="nd-sr-only">Close</span>
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
                "nd-flex nd-items-center nd-justify-between nd-shrink-0 nd-px-4 nd-h-14 nd-border-b nd-bg-background/95 nd-backdrop-blur-sm",
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
            className={cn("nd-flex-1 nd-min-h-0 nd-overflow-hidden", className)}
            {...props}
        />
    )
}

function Dialog2Footer({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="dialog2-footer"
            className={cn(
                "nd-flex nd-items-center nd-justify-end nd-gap-2 nd-shrink-0 nd-px-4 nd-py-3 nd-border-t nd-bg-background/95 nd-backdrop-blur-sm",
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
            className={cn("nd-text-base nd-font-semibold", className)}
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
            className={cn("nd-text-sm nd-text-muted-foreground", className)}
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
