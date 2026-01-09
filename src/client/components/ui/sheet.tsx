"use client"

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/client/utils"

const Sheet = SheetPrimitive.Root

const SheetTrigger = SheetPrimitive.Trigger

const SheetClose = SheetPrimitive.Close

const SheetPortal = SheetPrimitive.Portal

const SheetOverlay = React.forwardRef<
    React.ElementRef<typeof SheetPrimitive.Overlay>,
    React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
    <SheetPrimitive.Overlay
        className={cn(
            "nd-fixed nd-inset-0 nd-z-50 nd-bg-black/80 data-[state=open]:nd-animate-in data-[state=closed]:nd-animate-out data-[state=closed]:nd-fade-out-0 data-[state=open]:nd-fade-in-0",
            className
        )}
        {...props}
        ref={ref}
    />
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

const sheetVariants = cva(
    "nd-fixed nd-z-50 nd-gap-4 nd-bg-background nd-p-6 nd-shadow-lg nd-transition nd-ease-in-out data-[state=open]:nd-animate-in data-[state=closed]:nd-animate-out data-[state=closed]:nd-duration-300 data-[state=open]:nd-duration-500",
    {
        variants: {
            side: {
                top: "nd-inset-x-0 nd-top-0 nd-border-b data-[state=closed]:nd-slide-out-to-top data-[state=open]:nd-slide-in-from-top",
                bottom:
                    "nd-inset-x-0 nd-bottom-0 nd-border-t data-[state=closed]:nd-slide-out-to-bottom data-[state=open]:nd-slide-in-from-bottom",
                left: "nd-inset-y-0 nd-left-0 nd-h-full nd-w-3/4 nd-border-r data-[state=closed]:nd-slide-out-to-left data-[state=open]:nd-slide-in-from-left sm:nd-max-w-sm",
                right:
                    "nd-inset-y-0 nd-right-0 nd-h-full nd-w-3/4 nd-border-l data-[state=closed]:nd-slide-out-to-right data-[state=open]:nd-slide-in-from-right sm:nd-max-w-sm",
            },
        },
        defaultVariants: {
            side: "right",
        },
    }
)

interface SheetContentProps
    extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
    hideCloseButton?: boolean;
}

const SheetContent = React.forwardRef<
    React.ElementRef<typeof SheetPrimitive.Content>,
    SheetContentProps
>(({ side = "right", className, children, hideCloseButton, ...props }, ref) => (
    <SheetPortal>
        <SheetOverlay />
        <SheetPrimitive.Content
            ref={ref}
            className={cn(sheetVariants({ side }), className)}
            {...props}
        >
            {children}
            {!hideCloseButton && (
                <SheetPrimitive.Close className="nd-absolute nd-right-4 nd-top-4 nd-rounded-sm nd-opacity-70 nd-ring-offset-background nd-transition-opacity hover:nd-opacity-100 focus:nd-outline-none focus:nd-ring-2 focus:nd-ring-ring focus:nd-ring-offset-2 disabled:nd-pointer-events-none data-[state=open]:nd-bg-secondary">
                    <X className="nd-h-4 nd-w-4" />
                    <span className="nd-sr-only">Close</span>
                </SheetPrimitive.Close>
            )}
        </SheetPrimitive.Content>
    </SheetPortal>
))
SheetContent.displayName = SheetPrimitive.Content.displayName

const SheetHeader = ({
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
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({
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
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef<
    React.ElementRef<typeof SheetPrimitive.Title>,
    React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
    <SheetPrimitive.Title
        ref={ref}
        className={cn("nd-text-lg nd-font-semibold nd-text-foreground", className)}
        {...props}
    />
))
SheetTitle.displayName = SheetPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
    React.ElementRef<typeof SheetPrimitive.Description>,
    React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
    <SheetPrimitive.Description
        ref={ref}
        className={cn("nd-text-sm nd-text-muted-foreground", className)}
        {...props}
    />
))
SheetDescription.displayName = SheetPrimitive.Description.displayName

export {
    Sheet,
    SheetPortal,
    SheetOverlay,
    SheetTrigger,
    SheetClose,
    SheetContent,
    SheetHeader,
    SheetFooter,
    SheetTitle,
    SheetDescription,
}
