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
                "nd:bg-border nd:shrink-0 nd:data-[orientation=horizontal]:h-px nd:data-[orientation=horizontal]:w-full nd:data-[orientation=vertical]:h-full nd:data-[orientation=vertical]:w-px",
                className
            )}
            {...props}
        />
    )
}

export { Separator }
