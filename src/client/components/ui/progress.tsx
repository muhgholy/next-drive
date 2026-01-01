"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/client/utils"

function Progress({
     className,
     value,
     indicatorClassName,
     indeterminate = false,
     ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
     indicatorClassName?: string;
     indeterminate?: boolean;
}) {
     const isIndeterminate = indeterminate || value === undefined;

     return (
          <ProgressPrimitive.Root
               data-slot="progress"
               className={cn(
                    "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
                    className
               )}
               {...props}
          >
               <ProgressPrimitive.Indicator
                    data-slot="progress-indicator"
                    className={cn(
                         "bg-primary h-full flex-1 transition-all",
                         isIndeterminate && "w-1/3 animate-[indeterminate_1.5s_ease-in-out_infinite]",
                         !isIndeterminate && "w-full",
                         indicatorClassName
                    )}
                    style={isIndeterminate ? undefined : { transform: `translateX(-${100 - (value || 0)}%)` }}
               />
          </ProgressPrimitive.Root>
     )
}

export { Progress }
