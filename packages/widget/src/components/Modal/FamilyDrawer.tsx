"use client";

/**
 * FamilyDrawer — a multi-view bottom sheet with height-morphing, crossfading
 * views, and drag-to-dismiss. Inspired by the Family app drawer.
 *
 * Zero runtime dependencies (React only). No vaul, no framer-motion.
 * Drop this file into your project and import { FamilyDrawer, useFamilyDrawer }.
 *
 * The implementation is split across focused modules in this folder:
 *   - familyDrawerStyles        — the injected stylesheet
 *   - familyDrawerConstants     — timing + gesture thresholds
 *   - useFamilyDrawerViewMorph  — view crossfade + height morph
 *   - useFamilyDrawerDrag       — drag-to-dismiss gesture
 *   - useFamilyDrawerFocusTrap  — scroll lock, Escape, Tab trap
 * This file owns the open/visibility lifecycle and wires the pieces together.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { CLOSE_MS } from "./familyDrawerConstants";
import { useInjectStyles } from "./familyDrawerStyles";
import { useFamilyDrawerViewMorph } from "./useFamilyDrawerViewMorph";
import { useFamilyDrawerDrag } from "./useFamilyDrawerDrag";
import { useFamilyDrawerFocusTrap } from "./useFamilyDrawerFocusTrap";

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
// Root
// ============================================================================

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
  const [ready, setReady] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  // restore focus to whatever was focused before opening
  const lastFocused = useRef<HTMLElement | null>(null);

  const close = useCallback(() => setOpen(false), [setOpen]);

  // view crossfade + height morph
  const {
    view,
    setView,
    exiting,
    morphing,
    height,
    opacityDuration,
    measureRef,
    resetMorph,
  } = useFamilyDrawerViewMorph(defaultView, panelRef, onViewChange);

  // drag-to-dismiss (disabled when outside-click dismissal is off)
  const { dragging, dragY, resetDrag, onPointerDown, onPointerMove, endDrag } =
    useFamilyDrawerDrag(panelRef, close, closeOnOutsideClick);

  // body scroll lock, escape to close, focus management while open
  useFamilyDrawerFocusTrap(mounted, panelRef, close);

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
      resetMorph(); // reset height/view bookkeeping
      resetDrag(); // snap the panel back to rest
      lastFocused.current?.focus?.();
    }, CLOSE_MS);
    return () => clearTimeout(t);
  }, [isOpen, defaultView, resetMorph, resetDrag]);

  // mark ready (enables the height-morph transition) after first paint
  useEffect(() => {
    if (visible) {
      const r = requestAnimationFrame(() => setReady(true));
      return () => cancelAnimationFrame(r);
    }
  }, [visible]);

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
