"use client"

import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"

import { cn } from "@/client/utils"
import { buttonVariants } from "@/client/components/ui/button"

const AlertDialog = AlertDialogPrimitive.Root

const AlertDialogTrigger = AlertDialogPrimitive.Trigger

const AlertDialogPortal = AlertDialogPrimitive.Portal

const AlertDialogOverlay = React.forwardRef<
    React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
    React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
    <AlertDialogPrimitive.Overlay
        className={cn(
            "nd-fixed nd-inset-0 nd-z-50 nd-bg-black/80 data-[state=open]:nd-animate-in data-[state=closed]:nd-animate-out data-[state=closed]:nd-fade-out-0 data-[state=open]:nd-fade-in-0",
            className
        )}
        {...props}
        ref={ref}
    />
))
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName

const AlertDialogContent = React.forwardRef<
    React.ElementRef<typeof AlertDialogPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
    <AlertDialogPortal>
        <AlertDialogOverlay />
        <AlertDialogPrimitive.Content
            ref={ref}
            className={cn(
                "nd-fixed nd-left-[50%] nd-top-[50%] nd-z-50 nd-grid nd-w-full nd-max-w-lg nd-translate-x-[-50%] nd-translate-y-[-50%] nd-gap-4 nd-border nd-bg-background nd-p-6 nd-shadow-lg nd-duration-200 data-[state=open]:nd-animate-in data-[state=closed]:nd-animate-out data-[state=closed]:nd-fade-out-0 data-[state=open]:nd-fade-in-0 data-[state=closed]:nd-zoom-out-95 data-[state=open]:nd-zoom-in-95 data-[state=closed]:nd-slide-out-to-left-1/2 data-[state=closed]:nd-slide-out-to-top-[48%] data-[state=open]:nd-slide-in-from-left-1/2 data-[state=open]:nd-slide-in-from-top-[48%] sm:nd-rounded-lg",
                className
            )}
            {...props}
        />
    </AlertDialogPortal>
))
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName

const AlertDialogHeader = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "nd-flex nd-flex-col nd-space-y-2 nd-text-center sm:nd-text-left",
            className
        )}
        {...props}
    />
)
AlertDialogHeader.displayName = "AlertDialogHeader"

const AlertDialogFooter = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "nd-flex nd-flex-col-reverse sm:nd-flex-row sm:nd-justify-end sm:nd-space-x-2",
            className
        )}
        {...props}
    />
)
AlertDialogFooter.displayName = "AlertDialogFooter"

const AlertDialogTitle = React.forwardRef<
    React.ElementRef<typeof AlertDialogPrimitive.Title>,
    React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
    <AlertDialogPrimitive.Title
        ref={ref}
        className={cn("nd-text-lg nd-font-semibold", className)}
        {...props}
    />
))
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName

const AlertDialogDescription = React.forwardRef<
    React.ElementRef<typeof AlertDialogPrimitive.Description>,
    React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
    <AlertDialogPrimitive.Description
        ref={ref}
        className={cn("nd-text-sm nd-text-muted-foreground", className)}
        {...props}
    />
))
AlertDialogDescription.displayName =
    AlertDialogPrimitive.Description.displayName

const AlertDialogAction = React.forwardRef<
    React.ElementRef<typeof AlertDialogPrimitive.Action>,
    React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
    <AlertDialogPrimitive.Action
        ref={ref}
        className={cn(buttonVariants(), className)}
        {...props}
    />
))
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName

const AlertDialogCancel = React.forwardRef<
    React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
    React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
    <AlertDialogPrimitive.Cancel
        ref={ref}
        className={cn(
            buttonVariants({ variant: "outline" }),
            "nd-mt-2 sm:nd-mt-0",
            className
        )}
        {...props}
    />
))
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName

export {
    AlertDialog,
    AlertDialogPortal,
    AlertDialogOverlay,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogFooter,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogAction,
    AlertDialogCancel,
}
