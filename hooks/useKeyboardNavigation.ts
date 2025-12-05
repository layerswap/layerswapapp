import { useEffect, useCallback } from 'react';

export const useKeyboardNavigation = (
  onArrowDown: () => void,
  onArrowUp: () => void,
  onEnter: () => void,
  enabled: boolean = true
) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Only handle arrow keys and Enter - let all other keys pass through to search
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          onArrowDown();
          break;
        case 'ArrowUp':
          event.preventDefault();
          onArrowUp();
          break;
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
