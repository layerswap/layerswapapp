import * as React from "react"

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
export function useWidgetContainer(): HTMLElement | null {
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
