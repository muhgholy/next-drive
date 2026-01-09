"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/client/utils"

function Dialog({
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
    return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
    return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
    return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
    return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
    return (
        <DialogPrimitive.Overlay
            data-slot="dialog-overlay"
            className={cn(
                "nd:data-[state=open]:animate-in nd:data-[state=closed]:animate-out nd:data-[state=closed]:fade-out-0 nd:data-[state=open]:fade-in-0 nd:fixed nd:inset-0 nd:z-50 nd:bg-black/50",
                className
            )}
            {...props}
        />
    )
}

function DialogContent({
    className,
    children,
    showCloseButton = true,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
    showCloseButton?: boolean
}) {
    return (
        <DialogPortal data-slot="dialog-portal">
            <DialogOverlay />
            <DialogPrimitive.Content
                data-slot="dialog-content"
                className={cn(
                    "nd:bg-background nd:data-[state=open]:animate-in nd:data-[state=closed]:animate-out nd:data-[state=closed]:fade-out-0 nd:data-[state=open]:fade-in-0 nd:data-[state=closed]:zoom-out-95 nd:data-[state=open]:zoom-in-95 nd:fixed nd:top-[50%] nd:left-[50%] nd:z-50 nd:grid nd:w-full nd:max-w-[calc(100%-2rem)] nd:translate-x-[-50%] nd:translate-y-[-50%] nd:gap-4 nd:rounded-lg nd:border nd:p-6 nd:shadow-lg nd:duration-200 nd:sm:max-w-lg",
                    className
                )}
                {...props}
            >
                {children}
                {showCloseButton && (
                    <DialogPrimitive.Close
                        data-slot="dialog-close"
                        className="nd:ring-offset-background nd:focus:ring-ring nd:data-[state=open]:bg-accent nd:data-[state=open]:text-muted-foreground nd:absolute nd:top-4 nd:right-4 nd:rounded-xs nd:opacity-70 nd:transition-opacity nd:hover:opacity-100 nd:focus:ring-2 nd:focus:ring-offset-2 nd:focus:outline-hidden nd:disabled:pointer-events-none [&_svg]:nd:pointer-events-none [&_svg]:nd:shrink-0 [&_svg:not([class*='size-'])]:nd:size-4"
                    >
                        <X className="nd:size-4" />
                        <span className="nd:sr-only">Close</span>
                    </DialogPrimitive.Close>
                )}
            </DialogPrimitive.Content>
        </DialogPortal>
    )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="dialog-header"
            className={cn("nd:flex nd:flex-col nd:gap-2 nd:text-center nd:sm:text-left", className)}
            {...props}
        />
    )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="dialog-footer"
            className={cn(
                "nd:flex nd:flex-col-reverse nd:gap-2 nd:sm:flex-row nd:sm:justify-end",
                className
            )}
            {...props}
        />
    )
}

function DialogTitle({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
    return (
        <DialogPrimitive.Title
            data-slot="dialog-title"
            className={cn("nd:text-lg nd:leading-none nd:font-semibold", className)}
            {...props}
        />
    )
}

function DialogDescription({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
    return (
        <DialogPrimitive.Description
            data-slot="dialog-description"
            className={cn("nd:text-muted-foreground nd:text-sm", className)}
            {...props}
        />
    )
}

export {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogOverlay,
    DialogPortal,
    DialogTitle,
    DialogTrigger,
}
