import { useEffect, useCallback, useRef } from 'react';

export const useKeyboardNavigation = (
  onArrowDown: () => void,
  onArrowUp: () => void,
  /** Called with the data-nav-index of the focused NavigatableItem, or null to use focusedIndex state */
  onEnter: (navIndex: string | null) => void,
  enabled: boolean = true,
  /** Whether there's a focusedIndex set in React state (fallback for Enter when no DOM focus) */
  hasFocusedIndex: boolean = false
) => {
  const lastKeyTime = useRef<number>(0);
  const THROTTLE_MS = 75; // Throttle rapid key repeats to ~13 nav updates per second (better for large lists)

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Only handle arrow keys and Enter - let all other keys pass through to search
      switch (event.key) {
        case 'ArrowDown':
        case 'ArrowUp': {
          event.preventDefault();
          
          // Throttle arrow key navigation to prevent excessive updates when holding keys
          const now = Date.now();
          if (now - lastKeyTime.current < THROTTLE_MS) {
            return;
          }
          lastKeyTime.current = now;

          if (event.key === 'ArrowDown') {
            onArrowDown();
          } else {
            onArrowUp();
          }
          break;
        }
        case 'Enter': {
          // Check if the currently focused element is a NavigatableItem
          const activeElement = document.activeElement;
          const navIndex = activeElement?.getAttribute('data-nav-index');
          
          if (navIndex) {
            // DOM-focused element is a NavigatableItem - intercept Enter and trigger its click
            event.preventDefault();
            onEnter(navIndex);
          } else if (hasFocusedIndex) {
            // No DOM focus on NavigatableItem, but there's a focusedIndex in React state
            // (e.g., after arrow navigation blurred the element)
            event.preventDefault();
            onEnter(null);
          }
          // Otherwise, don't intercept - let native Enter behavior work (buttons, inputs, etc.)
          break;
        }
      }
    },
    [onArrowDown, onArrowUp, onEnter, enabled, hasFocusedIndex]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => { window.removeEventListener('keydown', handleKeyDown); };
  }, [handleKeyDown, enabled]);
};
