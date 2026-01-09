"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"

import { cn } from "@/client/utils"

function Label({
    className,
    ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
    return (
        <LabelPrimitive.Root
            data-slot="label"
            className={cn(
                "nd-flex nd-items-center nd-gap-2 nd-text-sm nd-leading-none nd-font-medium nd-select-none group-data-[disabled=true]:nd-pointer-events-none group-data-[disabled=true]:nd-opacity-50 peer-disabled:nd-cursor-not-allowed peer-disabled:nd-opacity-50",
                className
            )}
            {...props}
        />
    )
}

export { Label }
