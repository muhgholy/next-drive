import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/client/utils"

const alertVariants = cva(
    "nd-relative nd-w-full nd-rounded-lg nd-border nd-px-4 nd-py-3 nd-text-sm nd-grid has-[>svg]:nd-grid-cols-[calc(var(--spacing)*4)_1fr] nd-grid-cols-[0_1fr] has-[>svg]:nd-gap-x-3 nd-gap-y-0.5 nd-items-start [&>svg]:nd-size-4 [&>svg]:nd-translate-y-0.5 [&>svg]:nd-text-current",
    {
        variants: {
            variant: {
                default: "nd-bg-card nd-text-card-foreground",
                destructive:
                    "nd-text-destructive nd-bg-card [&>svg]:nd-text-current *:data-[slot=alert-description]:nd-text-destructive/90",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

function Alert({
    className,
    variant,
    ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
    return (
        <div
            data-slot="alert"
            role="alert"
            className={cn(alertVariants({ variant }), className)}
            {...props}
        />
    )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="alert-title"
            className={cn(
                "nd-col-start-2 nd-line-clamp-1 nd-min-h-4 nd-font-medium nd-tracking-tight",
                className
            )}
            {...props}
        />
    )
}

function AlertDescription({
    className,
    ...props
}: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="alert-description"
            className={cn(
                "nd-text-muted-foreground nd-col-start-2 nd-grid nd-justify-items-start nd-gap-1 nd-text-sm [&_p]:nd-leading-relaxed",
                className
            )}
            {...props}
        />
    )
}

export { Alert, AlertTitle, AlertDescription }
