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
                "nd:flex nd:items-center nd:gap-2 nd:text-sm nd:leading-none nd:font-medium nd:select-none group-nd:data-[disabled=true]:pointer-events-none group-nd:data-[disabled=true]:opacity-50 peer-nd:disabled:cursor-not-allowed peer-nd:disabled:opacity-50",
                className
            )}
            {...props}
        />
    )
}

export { Label }
