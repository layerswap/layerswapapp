import {
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { DRAG_CLOSE_PX, DRAG_CLOSE_VELOCITY } from "./familyDrawerConstants";

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

export interface FamilyDrawerDrag {
  /** True while a drag gesture is in progress. */
  dragging: boolean;
  /** Current vertical drag offset (px). */
  dragY: number;
  /** Snap the panel back to rest (called once the drawer is fully closed). */
  resetDrag: () => void;
  onPointerDown: (e: ReactPointerEvent) => void;
  onPointerMove: (e: ReactPointerEvent) => void;
  endDrag: () => void;
}

/**
 * Drag-to-dismiss for the bottom sheet. Translates the panel with the pointer,
 * rubber-bands upward drags, and dismisses on a far-enough drag or a fast flick.
 * Gestures that begin on an interactive element or inside a scrollable region
 * are left alone so they keep their native behaviour.
 */
export function useFamilyDrawerDrag(
  panelRef: RefObject<HTMLDivElement | null>,
  close: () => void,
  enabled: boolean
): FamilyDrawerDrag {
  const [dragging, setDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragMeta = useRef({ startY: 0, lastY: 0, lastT: 0, velocity: 0 });

  const onPointerDown = (e: ReactPointerEvent) => {
    // When outside-click dismissal is disabled, the drawer is locked to
    // explicit close actions — drag-to-dismiss is disabled too.
    if (!enabled) return;
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

  const onPointerMove = (e: ReactPointerEvent) => {
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

  const resetDrag = useCallback(() => setDragY(0), []);

  return { dragging, dragY, resetDrag, onPointerDown, onPointerMove, endDrag };
}
