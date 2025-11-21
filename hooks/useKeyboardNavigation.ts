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

      const isTextInput =
        event.target instanceof HTMLTextAreaElement ||
        (event.target instanceof HTMLInputElement &&
          (!event.target.type || event.target.type === 'text')) ||
        (event.target as HTMLElement).isContentEditable;
      const isArrowKey = ['ArrowDown', 'ArrowUp'].includes(event.key);

      if (isTextInput && !isArrowKey) return;

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
