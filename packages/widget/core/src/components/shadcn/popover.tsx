"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import clsx from 'clsx'

function Popover({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

/**
 * Reads `#widget` lazily after mount.
 *
 * Radix Portal defaults to `document.body`. The widget's Tailwind
 * utilities are scoped to `.layerswap-styles` (postcss-prefixwrap), so a
 * popover portaled to body picks up none of them — no z-index, no
 * background — and looks like the trigger did nothing. Defaulting to
 * `#widget` (always inside `.layerswap-styles`, also the target the
 * wallet drawer uses) keeps every popover in-scope by default. Callers
 * that need a different target can still pass `container` explicitly.
 */
function useWidgetContainer(): HTMLElement | null {
  const [el, setEl] = React.useState<HTMLElement | null>(null)
  // useLayoutEffect runs synchronously after DOM mutation, before paint, so
  // the portal resolves to `#widget` before the popover is first painted —
  // avoiding the body→#widget remount flash a passive effect would cause.
  // This component never renders server-side, so the SSR warning is moot.
  React.useLayoutEffect(() => {
    setEl(document.getElementById('widget'))
  }, [])
  return el
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  container,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & { container?: HTMLElement | null }) {
  const widgetContainer = useWidgetContainer()
  const resolvedContainer = container !== undefined ? container : widgetContainer
  return (
    <PopoverPrimitive.Portal container={resolvedContainer ?? undefined}>
      <div className="layerswap-styles">
        <PopoverPrimitive.Content
          data-slot="popover-content"
          align={align}
          sideOffset={sideOffset}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className={clsx(
            "z-50 w-fit max-w-72 origin-(--radix-popover-content-transform-origin) rounded-3xl bg-secondary-600 p-2 text-sm text-secondary-text shadow-sm ring-1 ring-primary-text/5 outline-hidden duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:ring-primary-text/10 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            className
          )}
          {...props}
        />
      </div>
    </PopoverPrimitive.Portal>
  )
}

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
