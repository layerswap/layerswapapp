import { useCallback, useState, useEffect } from 'react';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';

interface NavigableItem {
    childCount: number;
}

const parseIndex = (index: string): { parent: number; child?: number } => {
    const parts = index.split('.');
    return {
        parent: parseInt(parts[0]),
        child: parts[1] !== undefined ? parseInt(parts[1]) : undefined
    };
};

export const useRoutePickerNavigation = (navigableItems: NavigableItem[], searchQuery: string, shouldFocus: boolean) => {
    const [focusedIndex, setFocusedIndex] = useState<string | null>(null);
    const [isKeyboardNavigating, setIsKeyboardNavigating] = useState(false);
    const [isMouseMoving, setIsMouseMoving] = useState(false);

    // Reset focus to first item when search query changes
    useEffect(() => {
        if (searchQuery && navigableItems.length > 0) {
            setFocusedIndex("0");
        } else {
            setFocusedIndex(null);
        }
    }, [searchQuery, navigableItems.length]);

    const handleArrowDown = useCallback(() => {
        // Batch state updates for better performance
        if (!isKeyboardNavigating) {
            setIsKeyboardNavigating(true);
        }
        if (isMouseMoving) {
            setIsMouseMoving(false);
        }

        if (focusedIndex === null) {
            if (navigableItems.length > 0) {
                setFocusedIndex("0");
            }
            return;
        }
        const { parent, child } = parseIndex(focusedIndex);
        const navItem = navigableItems[parent];

        if (!navItem) {
            if (navigableItems.length > 0) {
                setFocusedIndex("0");
            }
            return;
        }

        if (child !== undefined) {
            if (child < navItem.childCount - 1) {
                setFocusedIndex(`${parent}.${child + 1}`);
            } else {
                if (parent < navigableItems.length - 1) {
                    setFocusedIndex(`${parent + 1}`);
                }
            }
        } else {
            if (navItem.childCount > 0) {
                setFocusedIndex(`${parent}.0`);
            } else if (parent < navigableItems.length - 1) {
                setFocusedIndex(`${parent + 1}`);
            }
        }
    }, [focusedIndex, navigableItems, isKeyboardNavigating, isMouseMoving]);

    const handleArrowUp = useCallback(() => {
        // Batch state updates for better performance
        if (!isKeyboardNavigating) {
            setIsKeyboardNavigating(true);
        }
        if (isMouseMoving) {
            setIsMouseMoving(false);
        }

        // If no focus, ArrowUp does nothing (search bar is not navigatable)
        if (focusedIndex === null) {
            return;
        }

        const { parent, child } = parseIndex(focusedIndex);
        const navItem = navigableItems[parent];

        if (!navItem) {
            if (navigableItems.length > 0) {
                setFocusedIndex("0");
            }
            return;
        }

        if (child !== undefined) {
            if (child > 0) {
                setFocusedIndex(`${parent}.${child - 1}`);
            } else {
                setFocusedIndex(`${parent}`);
            }
        } else {
            if (parent > 0) {
                const prevNavItem = navigableItems[parent - 1];
                if (prevNavItem.childCount > 0) {
                    setFocusedIndex(`${parent - 1}.${prevNavItem.childCount - 1}`);
                } else {
                    setFocusedIndex(`${parent - 1}`);
                }
            }
            // When at first item (parent === 0), ArrowUp does nothing - stay at first item
            // Search bar is never part of navigation
        }
    }, [focusedIndex, navigableItems, isKeyboardNavigating, isMouseMoving]);

    const handleEnter = useCallback(() => {
        if (focusedIndex === null) {
            return;
        }
        // Find the focused element and trigger its click event
        const element = document.querySelector(`[data-nav-index="${focusedIndex}"]`) as HTMLElement;

        if (element) {
            element.click();
        }
    }, [focusedIndex]);

    useKeyboardNavigation(
        handleArrowDown,
        handleArrowUp,
        handleEnter,
        shouldFocus
    );

    const handleHover = useCallback((index: string) => {
        // Only update on hover if mouse is actively moving (not keyboard navigating)
        if (!isMouseMoving) return;
        setFocusedIndex(index);
    }, [isMouseMoving]);

    // Manage keyboard-navigating CSS class
    useEffect(() => {
        if (isKeyboardNavigating) {
            document.body.classList.add('keyboard-navigating');
        } else {
            document.body.classList.remove('keyboard-navigating');
        }
        return () => {
            document.body.classList.remove('keyboard-navigating');
        };
    }, [isKeyboardNavigating]);

    // Detect mouse movement to enable hover updates
    useEffect(() => {
        let mouseMoveTimeout: NodeJS.Timeout;
        const handleMouseMove = () => {
            // Only update state if it's actually changing (prevents unnecessary renders)
            setIsMouseMoving(true);
            setIsKeyboardNavigating(false);

            // Debounce to detect when mouse stops moving
            clearTimeout(mouseMoveTimeout);
            mouseMoveTimeout = setTimeout(() => {
                setIsMouseMoving(false);
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
        handleHover
    };
};
