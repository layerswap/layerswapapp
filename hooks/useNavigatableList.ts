import { useCallback, useState, useEffect, useRef } from 'react';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { FocusedIndex, focusedIndexToString } from '@/components/NavigatableList/context';

export interface NavigableItem {
    childCount: number;
}

/** Parse a nav-index string (e.g., "1" or "2.3") to a FocusedIndex */
function parseNavIndex(navIndex: string): FocusedIndex | null {
    const parts = navIndex.split('.');
    const parent = parseInt(parts[0], 10);
    if (isNaN(parent)) return null;
    
    if (parts.length === 2) {
        const child = parseInt(parts[1], 10);
        if (isNaN(child)) return null;
        return { parent, child };
    }
    return { parent };
}

/** Get the FocusedIndex from the currently focused element, if it's a NavigatableItem */
function getFocusedElementIndex(): FocusedIndex | null {
    const activeElement = document.activeElement;
    const navIndex = activeElement?.getAttribute('data-nav-index');
    if (!navIndex) return null;
    return parseNavIndex(navIndex);
}

export interface UseNavigatableListOptions {
    navigableItems: NavigableItem[];
    enabled?: boolean;
    onReset?: () => void;
    keyboardNavigatingClass?: string;
    /** Callback to trigger click on item by nav-index string (e.g., "0" or "1.2") */
    onEnter?: (navIndex: string) => void;
}

export const useNavigatableList = ({
    navigableItems,
    enabled = true,
    onReset,
    keyboardNavigatingClass = 'keyboard-navigating',
    onEnter
}: UseNavigatableListOptions) => {
    const [focusedIndex, setFocusedIndex] = useState<FocusedIndex | null>(null);
    const [isKeyboardNavigating, setIsKeyboardNavigating] = useState(false);
    
    // Use refs for transient state to keep callbacks stable and avoid unnecessary re-renders
    const isMouseMovingRef = useRef(false);
    const isKeyboardNavigatingRef = useRef(false);
    
    // Sync ref with state (ref is read in event handler to avoid stale closure)
    useEffect(() => {
        isKeyboardNavigatingRef.current = isKeyboardNavigating;
    }, [isKeyboardNavigating]);

    // Reset focus only when explicitly requested (e.g., search query changes)
    useEffect(() => {
        if (onReset) {
            onReset();
            setFocusedIndex(null);
        }
    }, [onReset]);

    const handleArrowDown = useCallback(() => {
        setIsKeyboardNavigating(true);
        isMouseMovingRef.current = false;

        // If no focusedIndex, try to sync from the currently tab-focused element
        let currentIndex = focusedIndex;
        if (currentIndex === null) {
            const elementIndex = getFocusedElementIndex();
            if (elementIndex) {
                // Start navigation from the tab-focused element, blur it to remove DOM focus
                currentIndex = elementIndex;
                (document.activeElement as HTMLElement)?.blur?.();
            } else if (navigableItems.length > 0) {
                // No focused element, start from the beginning
                setFocusedIndex({ parent: 0 });
                return;
            } else {
                return;
            }
        }

        const { parent, child } = currentIndex;
        const navItem = navigableItems[parent];

        if (!navItem) {
            if (navigableItems.length > 0) {
                setFocusedIndex({ parent: 0 });
            }
            return;
        }

        if (child !== undefined) {
            if (child < navItem.childCount - 1) {
                setFocusedIndex({ parent, child: child + 1 });
            } else {
                if (parent < navigableItems.length - 1) {
                    setFocusedIndex({ parent: parent + 1 });
                }
            }
        } else {
            if (navItem.childCount > 0) {
                setFocusedIndex({ parent, child: 0 });
            } else if (parent < navigableItems.length - 1) {
                setFocusedIndex({ parent: parent + 1 });
            }
        }
    }, [focusedIndex, navigableItems]);

    const handleArrowUp = useCallback(() => {
        setIsKeyboardNavigating(true);
        isMouseMovingRef.current = false;

        // If no focusedIndex, try to sync from the currently tab-focused element
        let currentIndex = focusedIndex;
        if (currentIndex === null) {
            const elementIndex = getFocusedElementIndex();
            if (elementIndex) {
                // Start navigation from the tab-focused element, blur it to remove DOM focus
                currentIndex = elementIndex;
                (document.activeElement as HTMLElement)?.blur?.();
            } else {
                // No focused element, ArrowUp does nothing
                return;
            }
        }

        const { parent, child } = currentIndex;
        const navItem = navigableItems[parent];

        if (!navItem) {
            if (navigableItems.length > 0) {
                setFocusedIndex({ parent: 0 });
            }
            return;
        }

        if (child !== undefined) {
            if (child > 0) {
                setFocusedIndex({ parent, child: child - 1 });
            } else {
                setFocusedIndex({ parent });
            }
        } else {
            if (parent > 0) {
                const prevNavItem = navigableItems[parent - 1];
                if (prevNavItem.childCount > 0) {
                    setFocusedIndex({ parent: parent - 1, child: prevNavItem.childCount - 1 });
                } else {
                    setFocusedIndex({ parent: parent - 1 });
                }
            }
            // When at first item (parent === 0), ArrowUp does nothing - stay at first item
        }
    }, [focusedIndex, navigableItems]);

    // Handle Enter key - receives navIndex from DOM focus, or null to use focusedIndex state
    const handleEnter = useCallback((navIndex: string | null) => {
        // Use DOM-focused element's navIndex, or fall back to focusedIndex state
        const indexToUse = navIndex ?? (focusedIndex ? focusedIndexToString(focusedIndex) : null);
        if (indexToUse === null) {
            return;
        }
        // Trigger click via callback registry
        if (onEnter) {
            onEnter(indexToUse);
        }
    }, [onEnter, focusedIndex]);

    useKeyboardNavigation(
        handleArrowDown,
        handleArrowUp,
        handleEnter,
        enabled,
        focusedIndex !== null // hasFocusedIndex - allows Enter to work after arrow navigation
    );

    // Stable callback - uses ref to check mouse movement state
    const handleHover = useCallback((index: FocusedIndex) => {
        // Only update on hover if mouse is actively moving (not keyboard navigating)
        if (!isMouseMovingRef.current) return;
        setFocusedIndex(index);
    }, []);

    // Handle focus from Tab navigation - reset navigation state
    const handleFocus = useCallback(() => {
        setFocusedIndex(null);
        setIsKeyboardNavigating(false);
        isMouseMovingRef.current = false;
    }, []);

    // Manage keyboard-navigating CSS class
    useEffect(() => {
        if (isKeyboardNavigating) {
            document.body.classList.add(keyboardNavigatingClass);
        } else {
            document.body.classList.remove(keyboardNavigatingClass);
        }
        return () => {
            document.body.classList.remove(keyboardNavigatingClass);
        };
    }, [isKeyboardNavigating, keyboardNavigatingClass]);

    // Detect mouse movement to enable hover updates
    useEffect(() => {
        let mouseMoveTimeout: NodeJS.Timeout;
        const handleMouseMove = () => {
            // Update ref immediately (no re-render)
            isMouseMovingRef.current = true;
            
            // Only trigger re-render if keyboard navigating state is actually changing
            // Uses ref to check current state without causing effect to re-run
            if (isKeyboardNavigatingRef.current) {
                setIsKeyboardNavigating(false);
            }

            // Debounce to detect when mouse stops moving
            clearTimeout(mouseMoveTimeout);
            mouseMoveTimeout = setTimeout(() => {
                isMouseMovingRef.current = false;
            }, 100);
        };

        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            clearTimeout(mouseMoveTimeout);
        };
    }, []);

    return {
        focusedIndex,
        handleHover,
        handleFocus,
        isKeyboardNavigating
    };
};
