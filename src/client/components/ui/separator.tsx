"use client"

import * as React from "react"
import * as SeparatorPrimitive from "@radix-ui/react-separator"

import { cn } from "@/client/utils"

function Separator({
    className,
    orientation = "horizontal",
    decorative = true,
    ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
    return (
        <SeparatorPrimitive.Root
            data-slot="separator"
            decorative={decorative}
            orientation={orientation}
            className={cn(
                "nd-bg-border nd-shrink-0 data-[orientation=horizontal]:nd-h-px data-[orientation=horizontal]:nd-w-full data-[orientation=vertical]:nd-h-full data-[orientation=vertical]:nd-w-px",
                className
            )}
            {...props}
        />
    )
}

export { Separator }
