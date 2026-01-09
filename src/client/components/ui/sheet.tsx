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
            "nd:fixed nd:inset-0 nd:z-50 nd:bg-black/80 nd:data-[state=open]:animate-in nd:data-[state=closed]:animate-out nd:data-[state=closed]:fade-out-0 nd:data-[state=open]:fade-in-0",
            className
        )}
        {...props}
        ref={ref}
    />
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

const sheetVariants = cva(
    "nd:fixed nd:z-50 nd:gap-4 nd:bg-background nd:p-6 nd:shadow-lg nd:transition nd:ease-in-out nd:data-[state=open]:animate-in nd:data-[state=closed]:animate-out nd:data-[state=closed]:duration-300 nd:data-[state=open]:duration-500",
    {
        variants: {
            side: {
                top: "nd:inset-x-0 nd:top-0 nd:border-b nd:data-[state=closed]:slide-out-to-top nd:data-[state=open]:slide-in-from-top",
                bottom:
                    "nd:inset-x-0 nd:bottom-0 nd:border-t nd:data-[state=closed]:slide-out-to-bottom nd:data-[state=open]:slide-in-from-bottom",
                left: "nd:inset-y-0 nd:left-0 nd:h-full nd:w-3/4 nd:border-r nd:data-[state=closed]:slide-out-to-left nd:data-[state=open]:slide-in-from-left nd:sm:max-w-sm",
                right:
                    "nd:inset-y-0 nd:right-0 nd:h-full nd:w-3/4 nd:border-l nd:data-[state=closed]:slide-out-to-right nd:data-[state=open]:slide-in-from-right nd:sm:max-w-sm",
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
                <SheetPrimitive.Close className="nd:absolute nd:right-4 nd:top-4 nd:rounded-sm nd:opacity-70 nd:ring-offset-background nd:transition-opacity nd:hover:opacity-100 nd:focus:outline-none nd:focus:ring-2 nd:focus:ring-ring nd:focus:ring-offset-2 nd:disabled:pointer-events-none nd:data-[state=open]:bg-secondary">
                    <X className="nd:h-4 nd:w-4" />
                    <span className="nd:sr-only">Close</span>
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
            "nd:flex nd:flex-col nd:space-y-2 nd:text-center nd:sm:text-left",
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
            "nd:flex nd:flex-col-reverse nd:sm:flex-row nd:sm:justify-end nd:sm:space-x-2",
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
        className={cn("nd:text-lg nd:font-semibold nd:text-foreground", className)}
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
        className={cn("nd:text-sm nd:text-muted-foreground", className)}
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
