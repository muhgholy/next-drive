import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/client/utils"

const buttonVariants = cva(
    "nd:inline-flex nd:items-center nd:justify-center nd:gap-2 nd:whitespace-nowrap nd:rounded-md nd:text-sm nd:font-medium nd:transition-all nd:disabled:pointer-events-none nd:disabled:opacity-50 [&_svg]:nd:pointer-events-none [&_svg:not([class*='size-'])]:nd:size-4 nd:shrink-0 [&_svg]:nd:shrink-0 nd:outline-none nd:focus-visible:border-ring nd:focus-visible:ring-ring/50 nd:focus-visible:ring-[3px] aria-invalid:nd:ring-destructive/20 dark:aria-invalid:nd:ring-destructive/40 aria-invalid:nd:border-destructive",
    {
        variants: {
            variant: {
                default: "nd:bg-primary nd:text-primary-foreground nd:hover:bg-primary/90",
                destructive:
                    "nd:bg-destructive nd:text-white nd:hover:bg-destructive/90 nd:focus-visible:ring-destructive/20 dark:nd:focus-visible:ring-destructive/40",
                outline:
                    "nd:border nd:bg-background nd:shadow-xs nd:hover:bg-accent nd:hover:text-accent-foreground nd:dark:bg-input/30 nd:dark:border-input nd:dark:hover:bg-input/50",
                secondary:
                    "nd:bg-secondary nd:text-secondary-foreground nd:hover:bg-secondary/80",
                ghost:
                    "nd:hover:bg-accent nd:hover:text-accent-foreground nd:dark:hover:bg-accent/50",
                link: "nd:text-primary nd:underline-offset-4 nd:hover:underline",
            },
            size: {
                default: "nd:h-9 nd:px-4 nd:py-2 nd:has-[>svg]:px-3",
                sm: "nd:h-8 nd:rounded-md nd:gap-1.5 nd:px-3 nd:has-[>svg]:px-2.5",
                lg: "nd:h-10 nd:rounded-md nd:px-6 nd:has-[>svg]:px-4",
                icon: "nd:size-9",
                "icon-sm": "nd:size-8",
                "icon-lg": "nd:size-10",
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
