"use client"

import * as React from "react"
import { Tooltip as TooltipPrimitive } from "radix-ui"
import { cn } from "@layerswap/utils"
import { useWidgetContainer } from "@/lib/portal"

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

type TooltipProps = React.ComponentProps<typeof TooltipPrimitive.Root> & {
  openOnClick?: boolean
}

const TooltipClickContext = React.createContext<{
  openOnClick: boolean
  toggle?: () => void
}>({ openOnClick: false })

function Tooltip({
  delayDuration = 400,
  openOnClick,
  open: controlledOpen,
  onOpenChange,
  ...props
}: TooltipProps) {
  const isClickable = Boolean(openOnClick)
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const handleOpenChange = (next: boolean) => {
    if (isClickable) {
      if (!isControlled) setUncontrolledOpen(next)
      onOpenChange?.(next)
      return
    }
    onOpenChange?.(next)
  }

  const toggle = React.useCallback(() => {
    const next = !open
    if (!isControlled) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }, [open, isControlled, onOpenChange])

  return (
    <TooltipProvider>
      <TooltipClickContext.Provider value={{ openOnClick: isClickable, toggle }}>
        <TooltipPrimitive.Root
          data-slot="tooltip"
          delayDuration={delayDuration}
          {...(isClickable ? { open, onOpenChange: handleOpenChange } : { onOpenChange })}
          {...props}
        />
      </TooltipClickContext.Provider>
    </TooltipProvider>
  )
}

function TooltipTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  const { openOnClick, toggle } = React.useContext(TooltipClickContext)
  const handleClick = (e: any) => {
    onClick?.(e)
    if (openOnClick) {
      e.preventDefault()
      e.stopPropagation()
      toggle?.()
    }
  }
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" className={cn(
    "cursor-pointer",
    className
  )}
    onClick={handleClick}
    {...props} />
}

type TooltipContentProps = React.ComponentProps<typeof TooltipPrimitive.Content> & {
  arrowClasses?: string,
  showArrow?: boolean,
  container?: HTMLElement | null
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  arrowClasses,
  showArrow = false,
  container,
  ...props
}: TooltipContentProps) {
  const widgetContainer = useWidgetContainer()
  const resolvedContainer = container !== undefined ? container : widgetContainer
  return (
    <TooltipPrimitive.Portal container={resolvedContainer ?? undefined}>
      <div className="layerswap-styles">
        <TooltipPrimitive.Content
          data-slot="tooltip-content"
          sideOffset={sideOffset}
          className={cn(
            "z-50 origin-(--radix-tooltip-content-transform-origin) rounded-xl border border-secondary-600 bg-secondary-800 px-3 py-1.5 text-xs text-secondary-text has-data-[slot=kbd]:pr-1.5 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-50 **:data-[slot=kbd]:rounded-lg data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            className
          )}
          {...props}
        >
          {showArrow && <TooltipArrow className={arrowClasses} />}
          {children}
        </TooltipPrimitive.Content>
      </div>
    </TooltipPrimitive.Portal>
  )
}

function TooltipArrow({ className, ...props }: React.ComponentProps<typeof TooltipPrimitive.Arrow>) {
  return <TooltipPrimitive.Arrow className={cn("bg-secondary-500 fill-secondary-500 z-50 size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-[2px] data-[side=left]:translate-x-[-1.5px] data-[side=right]:translate-x-[1.5px]", className)} {...props} />
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, TooltipArrow }
