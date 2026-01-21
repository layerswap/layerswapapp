import { useCallback, useState, useEffect, useRef } from 'react';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { FocusedIndex } from '@/components/NavigatableList/context';

export interface NavigableItem {
    childCount: number;
}

export interface UseNavigatableListOptions {
    navigableItems: NavigableItem[];
    enabled?: boolean;
    onReset?: () => void;
    keyboardNavigatingClass?: string;
    /** Callback to trigger click on focused item (replaces DOM querySelector) */
    onEnter?: (index: FocusedIndex) => void;
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
    const hasInitializedRef = useRef(false);
    
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
            setFocusedIndex(navigableItems.length > 0 ? { parent: 0 } : null);
        }
    }, [onReset]);

    // Set initial focus when items first become available
    useEffect(() => {
        if (!hasInitializedRef.current && navigableItems.length > 0) {
            hasInitializedRef.current = true;
            setFocusedIndex({ parent: 0 });
        }
        // Reset initialization flag when all items are removed
        if (navigableItems.length === 0) {
            hasInitializedRef.current = false;
        }
    }, [navigableItems.length]);

    const handleArrowDown = useCallback(() => {
        setIsKeyboardNavigating(true);
        isMouseMovingRef.current = false;

        if (focusedIndex === null) {
            if (navigableItems.length > 0) {
                setFocusedIndex({ parent: 0 });
            }
            return;
        }

        const { parent, child } = focusedIndex;
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

        // If no focus, ArrowUp does nothing
        if (focusedIndex === null) {
            return;
        }

        const { parent, child } = focusedIndex;
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

    const handleEnter = useCallback(() => {
        if (focusedIndex === null) {
            return;
        }
        // Trigger click via callback registry (no DOM manipulation)
        if (onEnter) {
            onEnter(focusedIndex);
        }
    }, [focusedIndex, onEnter]);

    useKeyboardNavigation(
        handleArrowDown,
        handleArrowUp,
        handleEnter,
        enabled
    );

    // Stable callback - uses ref to check mouse movement state
    const handleHover = useCallback((index: FocusedIndex) => {
        // Only update on hover if mouse is actively moving (not keyboard navigating)
        if (!isMouseMovingRef.current) return;
        setFocusedIndex(index);
    }, []);

    // Handle focus from Tab navigation - always update focusedIndex
    const handleFocus = useCallback((index: FocusedIndex) => {
        setFocusedIndex(index);
        setIsKeyboardNavigating(true);
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
