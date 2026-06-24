import { useEffect } from "react";

// ============================================================================
// Styles (injected once into <head>)
// ============================================================================

const STYLE_ID = "family-drawer-styles";
const CSS = `
.fd {
  /* Map the drawer's palette onto Layerswap's themeable design tokens so it
     inherits the active theme even though it is portaled to <body>. The raw
     hex/rgb values are only fallbacks for when the tokens aren't present. */
  --fd-bg: var(--color-secondary-900, rgb(6, 10, 20));
  --fd-fg: var(--color-primary-text, rgb(225, 227, 230));
  --fd-muted-fg: var(--color-secondary-text, rgb(163, 173, 194));
  --fd-row: var(--color-secondary-700, rgb(14, 21, 36));
  --fd-row-hover: var(--color-secondary-600, rgb(18, 25, 41));
  --fd-border: var(--color-secondary-500, rgb(23, 31, 49));
  --fd-primary: var(--color-primary-500, rgb(204, 45, 93));
  --fd-primary-fg: var(--color-primary-buttonTextColor, rgb(228, 229, 240));
  --fd-ring: 0 0 0 2px var(--fd-bg),
    0 0 0 4px rgba(var(--ls-colors-primary-500, 204, 45, 93), 0.7);
  --fd-radius-panel: var(--radius-3xl, 24px);
  --fd-radius-row: var(--radius-2xl, 16px);
  --fd-morph: cubic-bezier(0.25, 1, 0.5, 1);
  --fd-slide: cubic-bezier(0.32, 0.72, 0, 1);
  --fd-fade: cubic-bezier(0.26, 0.08, 0.25, 1);
  /* Inherit the widget font (set on <body>) instead of forcing Apple's stack. */
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.fd-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(0, 0, 0, 0.5);
  opacity: 0;
  transition: opacity 350ms var(--fd-slide);
}
@supports ((-webkit-backdrop-filter: blur(2px)) or (backdrop-filter: blur(2px))) {
  .fd-overlay {
    -webkit-backdrop-filter: blur(2px);
    backdrop-filter: blur(2px);
  }
}
.fd-overlay[data-visible="true"] { opacity: 1; }

.fd-panel {
  position: fixed;
  inset-inline: 16px;
  bottom: 16px;
  z-index: 61;
  margin-inline: auto;
  width: auto;
  max-width: 420px;
  overflow: hidden;
  border-radius: var(--fd-radius-panel);
  background: var(--fd-bg);
  color: var(--fd-fg);
  outline: none;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.06),
    0 8px 24px rgba(0, 0, 0, 0.32), 0 24px 48px rgba(0, 0, 0, 0.4),
    inset 0 0 0 1px var(--fd-border);
  will-change: height, transform;
  touch-action: none;
}
/* In bare mode the hosted content may contain its own scroll areas, so let the
   browser handle touch scrolling; drag-to-dismiss is gated to gestures that
   don't start inside a scrollable region (see onPointerDown). */
.fd-panel--bare { touch-action: auto; }

/* drag affordance */
.fd-handle {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  width: 36px;
  height: 4px;
  border-radius: 9999px;
  background: var(--fd-border);
  z-index: 4;
}

.fd-measure { padding: 28px 20px 22px; }

/* "bare" mode: the hosted content supplies its own surface (background,
   padding, rounding), so the panel only contributes the morph/drag/shadow
   shell. Used when embedding a fully styled subtree (e.g. the deposit Widget). */
.fd-panel--bare {
  background: transparent;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.32), 0 24px 48px rgba(0, 0, 0, 0.4);
}
.fd-measure--bare { padding: 0; }

.fd-viewport { position: relative; }
.fd-view { width: 100%; }
.fd-view--exit {
  position: absolute;
  top: 0; left: 0; right: 0;
  pointer-events: none;
}

@keyframes fd-enter {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes fd-exit {
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0; transform: scale(0.96); }
}

/* control buttons */
.fd-icon-btn {
  position: absolute;
  top: 16px;
  display: flex;
  height: 30px;
  width: 30px;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 9999px;
  background: var(--fd-row);
  color: var(--fd-muted-fg);
  cursor: pointer;
  transition: transform 150ms var(--fd-morph), background 150ms ease,
    color 150ms ease;
  z-index: 5;
}
.fd-icon-btn:hover { background: var(--fd-row-hover); color: var(--fd-fg); }
.fd-icon-btn:focus-visible { box-shadow: var(--fd-ring); }
.fd-icon-btn:active { transform: scale(0.86); }
.fd-close { right: 16px; }
.fd-back { left: 16px; }

/* helper building blocks */
.fd-header { margin-top: 18px; }
.fd-header h2 {
  margin: 12px 0 0;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--fd-fg);
}
.fd-header p {
  margin: 6px 0 0;
  font-size: 14px;
  line-height: 20px;
  color: var(--fd-muted-fg);
}
.fd-icon-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  width: 44px;
  border-radius: var(--radius-xl, 12px);
  background: var(--fd-row);
  color: var(--fd-fg);
}

.fd-row {
  display: flex;
  height: 54px;
  width: 100%;
  align-items: center;
  gap: 14px;
  border: none;
  border-radius: var(--fd-radius-row);
  background: var(--fd-row);
  padding: 0 16px;
  font-size: 15px;
  font-weight: 500;
  color: var(--fd-fg);
  cursor: pointer;
  transition: transform 150ms var(--fd-morph), background 150ms ease;
}
.fd-row + .fd-row { margin-top: 8px; }
.fd-row:hover { background: var(--fd-row-hover); }
.fd-row:focus-visible { box-shadow: var(--fd-ring); }
.fd-row:active { transform: scale(0.975); }
.fd-row .fd-row-label { flex: 1; text-align: left; }
.fd-row .fd-chevron { color: var(--fd-muted-fg); flex-shrink: 0; }

.fd-btn {
  display: flex;
  height: 48px;
  width: 100%;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 9999px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 150ms var(--fd-morph), filter 150ms ease,
    background 150ms ease, color 150ms ease;
}
.fd-btn:focus-visible { box-shadow: var(--fd-ring); }
.fd-btn:active { transform: scale(0.97); }
.fd-btn-primary { background: var(--fd-primary); color: var(--fd-primary-fg); }
.fd-btn-primary:hover { filter: brightness(1.1); }
.fd-btn-secondary { background: transparent; color: var(--fd-muted-fg); }
.fd-btn-secondary:hover { color: var(--fd-fg); }

@media (prefers-reduced-motion: reduce) {
  .fd-panel, .fd-overlay, .fd-view, .fd-view--exit {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
`;

/** Inject the drawer's stylesheet into <head> exactly once per document. */
export function useInjectStyles() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
  }, []);
}
