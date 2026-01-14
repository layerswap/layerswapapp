import { useEffect, useCallback, useRef } from 'react';

export const useKeyboardNavigation = (
  onArrowDown: () => void,
  onArrowUp: () => void,
  onEnter: () => void,
  enabled: boolean = true
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
        case 'Enter':
          event.preventDefault();
          onEnter();
          break;
      }
    },
    [onArrowDown, onArrowUp, onEnter, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => { window.removeEventListener('keydown', handleKeyDown); };
  }, [handleKeyDown, enabled]);
};
