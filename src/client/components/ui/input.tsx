import * as React from "react"

import { cn } from "@/client/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
    return (
        <input
            type={type}
            data-slot="input"
            className={cn(
                "file:nd-text-foreground placeholder:nd-text-muted-foreground selection:nd-bg-primary selection:nd-text-primary-foreground dark:nd-bg-input/30 nd-border-input nd-h-9 nd-w-full nd-min-w-0 nd-rounded-md nd-border nd-bg-transparent nd-px-3 nd-py-1 nd-text-base nd-shadow-xs nd-transition-[color,box-shadow] nd-outline-none file:nd-inline-flex file:nd-h-7 file:nd-border-0 file:nd-bg-transparent file:nd-text-sm file:nd-font-medium disabled:nd-pointer-events-none disabled:nd-cursor-not-allowed disabled:nd-opacity-50 md:nd-text-sm",
                "focus-visible:nd-border-ring focus-visible:nd-ring-ring/50 focus-visible:nd-ring-[3px]",
                "aria-invalid:nd-ring-destructive/20 dark:aria-invalid:nd-ring-destructive/40 aria-invalid:nd-border-destructive",
                className
            )}
            {...props}
        />
    )
}

export { Input }
