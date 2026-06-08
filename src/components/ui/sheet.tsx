"use client"

import * as React from "react"
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { XIcon } from "lucide-react"

type SheetProps = SheetPrimitive.Root.Props & {
  onClose?: () => void
}

function Sheet({ onClose, onOpenChange, ...props }: SheetProps) {
  return (
    <SheetPrimitive.Root
      data-slot="sheet"
      disablePointerDismissal={false}
      onOpenChange={(open, eventDetails) => {
        onOpenChange?.(open, eventDetails)
        if (!open) {
          onClose?.()
        }
      }}
      {...props}
    />
  )
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/10 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs",
        className
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  size = "default",
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: "top" | "right" | "bottom" | "left"
  size?: "default" | "lg"
  showCloseButton?: boolean
}) {
  const panelWidth =
    side === "right" || side === "left"
      ? size === "lg"
        ? "w-full sm:w-[520px]"
        : "w-full sm:w-[480px]"
      : undefined

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "fixed z-[51] flex flex-col gap-0 overflow-hidden bg-popover p-0 text-popover-foreground shadow-lg transition duration-200 ease-in-out data-ending-style:opacity-0 data-starting-style:opacity-0",
          side === "bottom" &&
            "inset-x-0 bottom-0 h-auto border-t data-ending-style:translate-y-[2.5rem] data-starting-style:translate-y-[2.5rem]",
          side === "left" &&
            "inset-y-0 left-0 h-full border-r data-ending-style:translate-x-[-2.5rem] data-starting-style:translate-x-[-2.5rem]",
          side === "right" &&
            "inset-y-0 right-0 h-full border-l data-ending-style:translate-x-[2.5rem] data-starting-style:translate-x-[2.5rem]",
          side === "top" &&
            "inset-x-0 top-0 h-auto border-b data-ending-style:translate-y-[-2.5rem] data-starting-style:translate-y-[-2.5rem]",
          panelWidth,
          side === "left" && size === "default" && "sm:max-w-none",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <SheetPrimitive.Close
            type="button"
            data-slot="sheet-close"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
              "absolute top-4 right-4 z-[60]",
            )}
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        ) : null}
      </SheetPrimitive.Popup>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn(
        "shrink-0 border-b border-border px-6 pb-4 pt-6 pr-14",
        className,
      )}
      {...props}
    />
  )
}

function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-body"
      className={cn("min-h-0 flex-1 overflow-y-auto px-6 py-6", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        "mt-auto shrink-0 border-t border-border px-6 pb-6 pt-4",
        className,
      )}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-lg font-semibold tracking-tight text-foreground", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("mt-1 text-sm text-gray-500 dark:text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
