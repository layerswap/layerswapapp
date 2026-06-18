"use client";

/**
 * FamilyDrawer — a multi-view bottom sheet with height-morphing, crossfading
 * views, and drag-to-dismiss. Inspired by the Family app drawer.
 *
 * Zero runtime dependencies (React only). No vaul, no framer-motion.
 * Drop this file into your project and import { FamilyDrawer, useFamilyDrawer }.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

// ============================================================================
// Types
// ============================================================================

export type FamilyDrawerViewComponent = React.ComponentType;
export type ViewsRegistry = Record<string, FamilyDrawerViewComponent>;

interface FamilyDrawerContextValue {
  /** Current active view name. */
  view: string;
  /** Navigate to another view (triggers the height morph + crossfade). */
  setView: (view: string) => void;
  /** Whether the drawer is open. */
  isOpen: boolean;
  /** Close the drawer. */
  close: () => void;
  /** Crossfade duration in seconds, derived from the height delta. */
  opacityDuration: number;
}

const FamilyDrawerContext =
  createContext<FamilyDrawerContextValue | undefined>(undefined);

export function useFamilyDrawer(): FamilyDrawerContextValue {
  const ctx = useContext(FamilyDrawerContext);
  if (!ctx) {
    throw new Error("useFamilyDrawer must be used within <FamilyDrawer>");
  }
  return ctx;
}

/** Like useFamilyDrawer, but returns undefined outside a <FamilyDrawer>. Lets
 * hosted content detect the drawer and defer height animation to its morph
 * instead of running a competing one. */
export function useOptionalFamilyDrawer(): FamilyDrawerContextValue | undefined {
  return useContext(FamilyDrawerContext);
}

// ============================================================================
// Styles (injected once)
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

/** Walk from `target` up to (and excluding) `panel`, returning true if any
 * ancestor is a vertically scrollable element with overflowing content. Used
 * to avoid stealing scroll gestures for drag-to-dismiss. */
function startsInScrollable(
  target: HTMLElement | null,
  panel: HTMLElement | null
): boolean {
  let el: HTMLElement | null = target;
  while (el && el !== panel) {
    const oy = getComputedStyle(el).overflowY;
    if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight) {
      return true;
    }
    el = el.parentElement;
  }
  return false;
}

function useInjectStyles() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
  }, []);
}

// ============================================================================
// Root
// ============================================================================

const MIN_DURATION = 0.15;
const MAX_DURATION = 0.27;
const CLOSE_MS = 350;
const DRAG_CLOSE_PX = 110;
const DRAG_CLOSE_VELOCITY = 0.55; // px per ms

export interface FamilyDrawerProps {
  /** Map of view name -> component. Must include a `default` view. */
  views: ViewsRegistry;
  /** A single element that opens the drawer when clicked. */
  trigger: ReactElement;
  defaultView?: string;
  onViewChange?: (view: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** When true, the panel renders without its own background, padding, or drag
   * handle — the hosted view is expected to supply its own surface. Drag-to-
   * dismiss, height morphing, rounding, and the drop shadow are preserved. */
  bare?: boolean;
  /** When false, the drawer can only be dismissed by Escape or an explicit
   * close button — clicking the overlay outside the panel and drag-to-dismiss
   * are both disabled. Defaults to true. */
  closeOnOutsideClick?: boolean;
}

export function FamilyDrawer({
  views,
  trigger,
  defaultView = "default",
  onViewChange,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  bare = false,
  closeOnOutsideClick = true,
}: FamilyDrawerProps) {
  useInjectStyles();

  // open state (controlled or uncontrolled)
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? (controlledOpen as boolean) : internalOpen;
  const setOpen = useCallback(
    (next: boolean) => {
      onOpenChange?.(next);
      if (!isControlled) setInternalOpen(next);
    },
    [isControlled, onOpenChange]
  );

  // mount / visibility state machine for enter & exit transitions
  const [mounted, setMounted] = useState(isOpen);
  const [visible, setVisible] = useState(false);

  // view state + crossfade bookkeeping
  const [view, setViewState] = useState(defaultView);
  const viewRef = useRef(view);
  viewRef.current = view;
  const [exiting, setExiting] = useState<string | null>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // True only while a view transition is morphing. The height transition is
  // gated on this so that height changes *within* a view (an accordion opening,
  // a quote loading) snap to fit and let the hosted content run its own
  // animation — otherwise the drawer morph and the inner animation fight and
  // jitter. The morph still plays when the view actually changes.
  const [morphing, setMorphing] = useState(false);
  const morphTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // measurement + morph timing
  const measureRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const [opacityDuration, setOpacityDuration] = useState(MIN_DURATION);
  const prevHeightRef = useRef<number | null>(null);

  // drag state
  const [dragging, setDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragMeta = useRef({ startY: 0, lastY: 0, lastT: 0, velocity: 0 });

  // restore focus to whatever was focused before opening
  const lastFocused = useRef<HTMLElement | null>(null);

  const close = useCallback(() => setOpen(false), [setOpen]);

  const setView = useCallback(
    (next: string) => {
      const current = viewRef.current;
      if (next === current) return;
      viewRef.current = next;
      setExiting(current);
      clearTimeout(exitTimer.current);
      exitTimer.current = setTimeout(
        () => setExiting(null),
        opacityDuration * 1000 + 30
      );
      // Freeze the current height so the morph has a length to animate FROM
      // (CSS can't transition out of `auto`), then enable the height transition
      // for the duration of the view change only.
      const cur = panelRef.current?.offsetHeight;
      if (cur != null) setHeight(cur);
      setMorphing(true);
      clearTimeout(morphTimer.current);
      morphTimer.current = setTimeout(() => setMorphing(false), CLOSE_MS);
      onViewChange?.(next);
      setViewState(next);
    },
    [onViewChange, opacityDuration]
  );

  // clear any pending timers on unmount
  useEffect(
    () => () => {
      clearTimeout(exitTimer.current);
      clearTimeout(morphTimer.current);
    },
    []
  );

  // Measure content height only while a view is morphing. Outside a morph the
  // panel runs at `height: auto` and follows its content via plain CSS layout —
  // so an accordion or quote animating inside drives the panel for free, with
  // no ResizeObserver re-renders fighting it (that was the mobile jank).
  useLayoutEffect(() => {
    if (!morphing) return;
    const el = measureRef.current;
    if (!el) return;
    const measure = () => {
      const h = el.offsetHeight;
      setHeight(h);
      const prev = prevHeightRef.current;
      if (prev == null) {
        prevHeightRef.current = h;
        setOpacityDuration(MIN_DURATION);
      } else {
        const diff = Math.abs(h - prev);
        prevHeightRef.current = h;
        setOpacityDuration(
          Math.min(Math.max(diff / 500, MIN_DURATION), MAX_DURATION)
        );
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [morphing, view]);

  // drive enter/exit transitions off `isOpen`
  useEffect(() => {
    if (isOpen) {
      lastFocused.current = (document.activeElement as HTMLElement) ?? null;
      setMounted(true);
      const r1 = requestAnimationFrame(() =>
        requestAnimationFrame(() => setVisible(true))
      );
      return () => cancelAnimationFrame(r1);
    }
    setVisible(false);
    const t = setTimeout(() => {
      setMounted(false);
      setReady(false);
      prevHeightRef.current = null;
      setHeight(undefined);
      setDragY(0);
      setViewState(defaultView); // reset to default once fully closed
      lastFocused.current?.focus?.();
    }, CLOSE_MS);
    return () => clearTimeout(t);
  }, [isOpen, defaultView]);

  // mark ready (enables the height-morph transition) after first paint
  useEffect(() => {
    if (visible) {
      const r = requestAnimationFrame(() => setReady(true));
      return () => cancelAnimationFrame(r);
    }
  }, [visible]);

  // body scroll lock, escape to close, focus management while open
  useEffect(() => {
    if (!mounted) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const focusTimer = setTimeout(() => panelRef.current?.focus(), 60);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKeyDown);
      clearTimeout(focusTimer);
    };
  }, [mounted, close]);

  // ---- drag-to-dismiss ----
  const onPointerDown = (e: React.PointerEvent) => {
    // When outside-click dismissal is disabled, the drawer is locked to
    // explicit close actions — drag-to-dismiss is disabled too.
    if (!closeOnOutsideClick) return;
    const target = e.target as HTMLElement;
    if (
      target.closest(
        'button, a, input, textarea, select, [role="button"], [data-no-drag]'
      )
    ) {
      return; // let interactive elements receive the gesture
    }
    // Don't hijack gestures that begin inside a scrollable region — let the
    // browser scroll instead (only relevant in `bare` mode, where inner
    // content keeps native touch scrolling).
    if (startsInScrollable(target, panelRef.current)) return;
    setDragging(true);
    dragMeta.current = {
      startY: e.clientY,
      lastY: e.clientY,
      lastT: performance.now(),
      velocity: 0,
    };
    panelRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const now = performance.now();
    const m = dragMeta.current;
    const dt = now - m.lastT;
    if (dt > 0) m.velocity = (e.clientY - m.lastY) / dt;
    m.lastY = e.clientY;
    m.lastT = now;
    let dy = e.clientY - m.startY;
    if (dy < 0) dy /= 3; // rubber-band when dragging up
    setDragY(dy);
  };

  const endDrag = () => {
    if (!dragging) return;
    setDragging(false);
    const { velocity } = dragMeta.current;
    if (dragY > DRAG_CLOSE_PX || velocity > DRAG_CLOSE_VELOCITY) {
      close();
    } else {
      setDragY(0);
    }
  };

  const contextValue = useMemo<FamilyDrawerContextValue>(
    () => ({ view, setView, isOpen, close, opacityDuration }),
    [view, setView, isOpen, close, opacityDuration]
  );

  // trigger element (clone to attach onClick + a11y)
  const triggerEl = React.cloneElement(
    trigger as ReactElement<Record<string, unknown>>,
    {
      onClick: (e: React.MouseEvent) => {
        (trigger.props as { onClick?: (e: React.MouseEvent) => void }).onClick?.(
          e
        );
        setOpen(true);
      },
      "aria-haspopup": "dialog",
      "aria-expanded": isOpen,
    }
  );

  const heightTrans =
    ready && !dragging && morphing ? "height 270ms var(--fd-morph)" : "";
  const transformTrans = dragging ? "" : "transform 350ms var(--fd-slide)";
  const transition =
    [heightTrans, transformTrans].filter(Boolean).join(", ") || "none";

  const CurrentView = views[view] ?? views.default;
  const ExitingView = exiting ? views[exiting] ?? null : null;

  return (
    <FamilyDrawerContext.Provider value={contextValue}>
      {triggerEl}
      {mounted &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fd">
            <div
              className="fd-overlay"
              data-visible={visible}
              onClick={closeOnOutsideClick ? close : undefined}
            />
            <div
              ref={panelRef}
              className={bare ? "fd-panel fd-panel--bare" : "fd-panel"}
              role="dialog"
              aria-modal="true"
              aria-label="Drawer"
              tabIndex={-1}
              style={{
                height: morphing && height != null ? height : "auto",
                transform: visible
                  ? `translateY(${dragY}px)`
                  : "translateY(110%)",
                transition,
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              {!bare && <span className="fd-handle" aria-hidden />}
              <div
                ref={measureRef}
                className={bare ? "fd-measure fd-measure--bare" : "fd-measure"}
              >
                <div className="fd-viewport">
                  <div
                    key={view}
                    className="fd-view"
                    style={{
                      animation: `fd-enter ${opacityDuration}s var(--fd-fade) both`,
                    }}
                  >
                    <CurrentView />
                  </div>
                  {ExitingView && (
                    <div
                      key={`exit-${exiting}`}
                      className="fd-view fd-view--exit"
                      aria-hidden
                      inert
                      style={{
                        animation: `fd-exit ${opacityDuration}s var(--fd-fade) both`,
                      }}
                    >
                      <ExitingView />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </FamilyDrawerContext.Provider>
  );
}

// ============================================================================
// Helper building blocks (optional, for building nice-looking views)
// ============================================================================

export function FamilyDrawerClose() {
  const { close } = useFamilyDrawer();
  return (
    <button
      type="button"
      className="fd-icon-btn fd-close"
      aria-label="Close"
      data-no-drag
      onClick={close}
    >
      <CloseIcon />
    </button>
  );
}

export function FamilyDrawerBack({ to = "default" }: { to?: string }) {
  const { setView } = useFamilyDrawer();
  return (
    <button
      type="button"
      className="fd-icon-btn fd-back"
      aria-label="Back"
      data-no-drag
      onClick={() => setView(to)}
    >
      <ChevronLeftIcon />
    </button>
  );
}

export function FamilyDrawerHeader({
  icon,
  title,
  description,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <header className="fd-header">
      {icon && <span className="fd-icon-badge">{icon}</span>}
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </header>
  );
}

export function FamilyDrawerRow({
  icon,
  children,
  onClick,
}: {
  icon?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button type="button" className="fd-row" data-no-drag onClick={onClick}>
      {icon}
      <span className="fd-row-label">{children}</span>
      <span className="fd-chevron">
        <ChevronRightIcon />
      </span>
    </button>
  );
}

export function FamilyDrawerPrimaryButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className="fd-btn fd-btn-primary"
      data-no-drag
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function FamilyDrawerSecondaryButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className="fd-btn fd-btn-secondary"
      data-no-drag
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// ============================================================================
// Icons (inline, no dependency)
// ============================================================================

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M10.485 2 2 10.485M10.485 10.485 2 2"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
function ChevronLeftIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ChevronRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}