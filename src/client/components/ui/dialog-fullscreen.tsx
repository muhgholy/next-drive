"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/client/utils"

// ** Dialog2 - Modern fullscreen dialog on mobile, centered on desktop
function Dialog2({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
     return <DialogPrimitive.Root data-slot="dialog2" {...props} />
}

function Dialog2Trigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
     return <DialogPrimitive.Trigger data-slot="dialog2-trigger" {...props} />
}

function Dialog2Close({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
     return <DialogPrimitive.Close data-slot="dialog2-close" {...props} />
}

function Dialog2Content({
     className,
     children,
     showCloseButton = true,
     ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
     showCloseButton?: boolean
}) {
     return (
          <DialogPrimitive.Portal data-slot="dialog2-portal">
               {/* Overlay with higher z-index for proper stacking */}
               <DialogPrimitive.Overlay
                    data-slot="dialog2-overlay"
                    className={cn(
                         "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
                         "data-[state=open]:animate-in data-[state=closed]:animate-out",
                         "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
                    )}
               />
               {/* Content: Fullscreen on mobile, centered modal on desktop */}
               <DialogPrimitive.Content
                    data-slot="dialog2-content"
                    className={cn(
                         // Base styles
                         "fixed z-50 flex flex-col bg-background shadow-2xl outline-none",
                         // Mobile: Full screen
                         "inset-0 rounded-none",
                         // Desktop: Centered modal with max dimensions
                         "md:inset-auto md:top-[50%] md:left-[50%] md:translate-x-[-50%] md:translate-y-[-50%]",
                         "md:max-w-5xl md:w-[95vw] md:max-h-[90vh] md:rounded-xl md:border",
                         // Animations
                         "data-[state=open]:animate-in data-[state=closed]:animate-out",
                         "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                         "data-[state=closed]:slide-out-to-bottom-2 data-[state=open]:slide-in-from-bottom-2",
                         "md:data-[state=closed]:zoom-out-95 md:data-[state=open]:zoom-in-95",
                         "md:data-[state=closed]:slide-out-to-bottom-0 md:data-[state=open]:slide-in-from-bottom-0",
                         "duration-200",
                         className
                    )}
                    {...props}
               >
                    {children}
                    {showCloseButton && (
                         <DialogPrimitive.Close
                              data-slot="dialog2-close"
                              className={cn(
                                   "absolute top-3 right-3 z-10",
                                   "flex items-center justify-center size-8 rounded-full",
                                   "bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground",
                                   "transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                                   "md:top-4 md:right-4 md:size-7 md:rounded-md md:bg-transparent"
                              )}
                         >
                              <X className="size-4" />
                              <span className="sr-only">Close</span>
                         </DialogPrimitive.Close>
                    )}
               </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
     )
}

function Dialog2Header({ className, ...props }: React.ComponentProps<"div">) {
     return (
          <div
               data-slot="dialog2-header"
               className={cn(
                    "flex items-center justify-between shrink-0 px-4 h-14 border-b bg-background/95 backdrop-blur-sm",
                    className
               )}
               {...props}
          />
     )
}

function Dialog2Body({ className, ...props }: React.ComponentProps<"div">) {
     return (
          <div
               data-slot="dialog2-body"
               className={cn("flex-1 min-h-0 overflow-hidden", className)}
               {...props}
          />
     )
}

function Dialog2Footer({ className, ...props }: React.ComponentProps<"div">) {
     return (
          <div
               data-slot="dialog2-footer"
               className={cn(
                    "flex items-center justify-end gap-2 shrink-0 px-4 py-3 border-t bg-background/95 backdrop-blur-sm",
                    className
               )}
               {...props}
          />
     )
}

function Dialog2Title({
     className,
     ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
     return (
          <DialogPrimitive.Title
               data-slot="dialog2-title"
               className={cn("text-base font-semibold", className)}
               {...props}
          />
     )
}

function Dialog2Description({
     className,
     ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
     return (
          <DialogPrimitive.Description
               data-slot="dialog2-description"
               className={cn("text-sm text-muted-foreground", className)}
               {...props}
          />
     )
}

export {
     Dialog2,
     Dialog2Close,
     Dialog2Content,
     Dialog2Body,
     Dialog2Description,
     Dialog2Footer,
     Dialog2Header,
     Dialog2Title,
     Dialog2Trigger,
}
