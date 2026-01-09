import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/client/utils"

const buttonVariants = cva(
    "nd-inline-flex nd-items-center nd-justify-center nd-gap-2 nd-whitespace-nowrap nd-rounded-md nd-text-sm nd-font-medium nd-transition-all disabled:nd-pointer-events-none disabled:nd-opacity-50 [&_svg]:nd-pointer-events-none [&_svg:not([class*='size-'])]:nd-size-4 nd-shrink-0 [&_svg]:nd-shrink-0 nd-outline-none focus-visible:nd-border-ring focus-visible:nd-ring-ring/50 focus-visible:nd-ring-[3px] aria-invalid:nd-ring-destructive/20 dark:aria-invalid:nd-ring-destructive/40 aria-invalid:nd-border-destructive",
    {
        variants: {
            variant: {
                default: "nd-bg-primary nd-text-primary-foreground hover:nd-bg-primary/90",
                destructive:
                    "nd-bg-destructive nd-text-white hover:nd-bg-destructive/90 focus-visible:nd-ring-destructive/20 dark:focus-visible:nd-ring-destructive/40",
                outline:
                    "nd-border nd-bg-background nd-shadow-xs hover:nd-bg-accent hover:nd-text-accent-foreground dark:nd-bg-input/30 dark:nd-border-input dark:hover:nd-bg-input/50",
                secondary:
                    "nd-bg-secondary nd-text-secondary-foreground hover:nd-bg-secondary/80",
                ghost:
                    "hover:nd-bg-accent hover:nd-text-accent-foreground dark:hover:nd-bg-accent/50",
                link: "nd-text-primary nd-underline-offset-4 hover:nd-underline",
            },
            size: {
                default: "nd-h-9 nd-px-4 nd-py-2 has-[>svg]:nd-px-3",
                sm: "nd-h-8 nd-rounded-md nd-gap-1.5 nd-px-3 has-[>svg]:nd-px-2.5",
                lg: "nd-h-10 nd-rounded-md nd-px-6 has-[>svg]:nd-px-4",
                icon: "nd-size-9",
                "icon-sm": "nd-size-8",
                "icon-lg": "nd-size-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

function Button({
    className,
    variant,
    size,
    asChild = false,
    ...props
}: React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
        asChild?: boolean
    }) {
    const Comp = asChild ? Slot : "button"

    return (
        <Comp
            data-slot="button"
            className={cn(buttonVariants({ variant, size, className }))}
            {...props}
        />
    )
}

export { Button, buttonVariants }
