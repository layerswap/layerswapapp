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
        setIsKeyboardNavigating(true);
        setIsMouseMoving(false);

        if (focusedIndex === null) {
            if (navigableItems.length > 0) {
                setFocusedIndex("0");
            }
            return;
        }
        const { parent, child } = parseIndex(focusedIndex);
        const navItem = navigableItems[parent];

        if (!navItem) {
            if (navigableItems.length > 0)
                setFocusedIndex("0");
            return;
        }

        if (child !== undefined) {
            if (child < navItem.childCount - 1) {
                setFocusedIndex(`${parent}.${child + 1}`);
            } else {
                if (parent < navigableItems.length - 1)
                    setFocusedIndex(`${parent + 1}`);
            }
        } else {
            if (navItem.childCount > 0) {
                setFocusedIndex(`${parent}.0`);
            } else if (parent < navigableItems.length - 1) {
                setFocusedIndex(`${parent + 1}`);
            }
        }
    }, [focusedIndex, navigableItems]);

    const handleArrowUp = useCallback(() => {
        setIsKeyboardNavigating(true);
        setIsMouseMoving(false);

        // If no focus, ArrowUp does nothing (search bar is not navigatable)
        if (focusedIndex === null)
            return;

        const { parent, child } = parseIndex(focusedIndex);
        const navItem = navigableItems[parent];

        if (!navItem) {
            if (navigableItems.length > 0)
                setFocusedIndex("0");
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
    }, [focusedIndex, navigableItems]);

    const handleEnter = useCallback(() => {
        if (focusedIndex === null) return;
        // Find the focused element and trigger its click event
        const element = document.querySelector(`[data-nav-index="${focusedIndex}"]`) as HTMLElement;

        if (element) element.click();
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

    // Detect mouse movement to enable hover updates
    useEffect(() => {
        if (isKeyboardNavigating) {
            document.body.classList.add('keyboard-navigating');
        } else {
            document.body.classList.remove('keyboard-navigating');
        }

        let mouseMoveTimeout: NodeJS.Timeout;
        const handleMouseMove = () => {
            // Enable mouse hover updates when mouse is actively moving
            setIsMouseMoving(true);
            setIsKeyboardNavigating(false);

            // Debounce to detect when mouse stops moving
            clearTimeout(mouseMoveTimeout);
            mouseMoveTimeout = setTimeout(() => {
                setIsMouseMoving(false);
            }, 100);
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            document.body.classList.remove('keyboard-navigating');
            clearTimeout(mouseMoveTimeout);
        };
    }, [isKeyboardNavigating]);

    return {
        focusedIndex,
        handleHover
    };
};
