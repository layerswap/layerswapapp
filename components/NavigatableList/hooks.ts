import { useEffect, useRef, useCallback } from 'react';
import { useNavigatableListUpdate, FocusedIndex } from './context';

/**
 * Hook to handle scrolling element into view when focused
 */
export function useScrollIntoView(isFocused: boolean) {
    const elementRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (isFocused && elementRef.current) {
            elementRef.current.scrollIntoView({ block: 'nearest', behavior: 'auto' });
        }
    }, [isFocused]);

    return elementRef;
}

/**
 * Hook to handle Space key press triggering onClick
 */
export function useSpaceKeyClick(onClick?: () => void, onKeyDown?: (e: React.KeyboardEvent) => void) {
    return useCallback((e: React.KeyboardEvent) => {
        if (e.key === ' ') {
            e.preventDefault();
            if (onClick) {
                onClick();
            }
        }
        if (onKeyDown) {
            onKeyDown(e);
        }
    }, [onClick, onKeyDown]);
}

/**
 * Hook to handle mouse enter with hover index update
 */
export function useHoverHandler(index: FocusedIndex, onMouseEnter?: () => void) {
    const { handleHover } = useNavigatableListUpdate();

    // Use primitive values as deps to avoid new callback on every render
    // (index is a new object each render, but parent/child are stable)
    return useCallback(() => {
        handleHover(index);
        if (onMouseEnter) {
            onMouseEnter();
        }
    }, [handleHover, index.parent, index.child, onMouseEnter]);
}

/**
 * Hook to handle focus events (e.g., from Tab navigation)
 * Resets navigation state when focus changes via Tab
 */
export function useFocusHandler(onFocus?: () => void) {
    const { handleFocus } = useNavigatableListUpdate();

    return useCallback(() => {
        handleFocus();
        if (onFocus) {
            onFocus();
        }
    }, [handleFocus, onFocus]);
}

/**
 * Hook to merge multiple refs into a single ref callback
 */
export function useMergedRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
    return useCallback((element: T | null) => {
        refs.forEach(ref => {
            if (!ref) return;

            if (typeof ref === 'function') {
                ref(element);
            } else if ('current' in ref) {
                (ref as React.MutableRefObject<T | null>).current = element;
            }
        });
    }, refs);
}
