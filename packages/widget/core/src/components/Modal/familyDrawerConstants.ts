// Timing + gesture thresholds shared across the FamilyDrawer modules.

/** Shortest crossfade, in seconds (small height deltas). */
export const MIN_DURATION = 0.15;
/** Longest crossfade, in seconds (large height deltas). */
export const MAX_DURATION = 0.27;
/** Exit/morph window in ms — kept in sync with the CSS transition durations so
 * the panel is unmounted (and morph state reset) only after it has animated out. */
export const CLOSE_MS = 350;
/** Drag distance (px) past which releasing dismisses the drawer. */
export const DRAG_CLOSE_PX = 110;
/** Drag velocity (px per ms) past which a flick dismisses the drawer. */
export const DRAG_CLOSE_VELOCITY = 0.55;
