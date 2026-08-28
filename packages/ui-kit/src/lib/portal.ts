/**
 * Reads `#widget` from the document.
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
    return typeof document !== 'undefined' ? document.getElementById('widget') : null
}
