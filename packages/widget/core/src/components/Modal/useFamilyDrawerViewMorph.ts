import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { CLOSE_MS, MAX_DURATION, MIN_DURATION } from "./familyDrawerConstants";

export interface FamilyDrawerViewMorph {
  /** Currently active view name. */
  view: string;
  /** Navigate to another view (triggers the height morph + crossfade). */
  setView: (next: string) => void;
  /** The outgoing view name while a crossfade is in flight, else null. */
  exiting: string | null;
  /** True only while a view transition is morphing (gates the height tween). */
  morphing: boolean;
  /** Frozen panel height (px) during a morph; undefined when running at auto. */
  height: number | undefined;
  /** Crossfade duration in seconds, derived from the height delta. */
  opacityDuration: number;
  /** Attach to the element whose height is measured during a morph. */
  measureRef: RefObject<HTMLDivElement | null>;
  /** Reset morph bookkeeping back to the default view (called once the drawer
   * is fully closed). */
  resetMorph: () => void;
}

/**
 * Owns the view-crossfade + height-morph machinery: which view is active, the
 * outgoing view during a crossfade, and the height/opacity timing measured
 * while a morph is in flight.
 *
 * The height transition is gated on `morphing` so that height changes *within*
 * a view (an accordion opening, a quote loading) snap to fit and let the hosted
 * content run its own animation — otherwise the drawer morph and the inner
 * animation fight and jitter. The morph only plays when the view changes.
 */
export function useFamilyDrawerViewMorph(
  defaultView: string,
  panelRef: RefObject<HTMLDivElement | null>,
  onViewChange?: (view: string) => void
): FamilyDrawerViewMorph {
  const measureRef = useRef<HTMLDivElement>(null);

  // view state + crossfade bookkeeping
  const [view, setViewState] = useState(defaultView);
  const viewRef = useRef(view);
  viewRef.current = view;
  const [exiting, setExiting] = useState<string | null>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [morphing, setMorphing] = useState(false);
  const morphTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // measurement + morph timing
  const [height, setHeight] = useState<number | undefined>(undefined);
  const [opacityDuration, setOpacityDuration] = useState(MIN_DURATION);
  // Latest opacityDuration readable from stable callbacks without making them
  // depend on it. It updates on every measured frame during a morph, so listing
  // it as a dependency would re-create setView (and thus the drawer context) on
  // every frame. See `measure()` below.
  const opacityDurationRef = useRef(opacityDuration);
  opacityDurationRef.current = opacityDuration;
  const prevHeightRef = useRef<number | null>(null);

  const setView = useCallback(
    (next: string) => {
      const current = viewRef.current;
      if (next === current) return;
      viewRef.current = next;
      setExiting(current);
      clearTimeout(exitTimer.current);
      exitTimer.current = setTimeout(
        () => setExiting(null),
        opacityDurationRef.current * 1000 + 30
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
    [onViewChange, panelRef]
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
      const next =
        prev == null
          ? MIN_DURATION
          : Math.min(
              Math.max(Math.abs(h - prev) / 500, MIN_DURATION),
              MAX_DURATION
            );
      prevHeightRef.current = h;
      // Skip no-op updates so trailing ResizeObserver frames that don't change
      // the duration don't re-render the drawer (and its hosted view tree).
      setOpacityDuration((d) => (d === next ? d : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [morphing, view]);

  const resetMorph = useCallback(() => {
    prevHeightRef.current = null;
    setHeight(undefined);
    setViewState(defaultView);
  }, [defaultView]);

  return {
    view,
    setView,
    exiting,
    morphing,
    height,
    opacityDuration,
    measureRef,
    resetMorph,
  };
}
