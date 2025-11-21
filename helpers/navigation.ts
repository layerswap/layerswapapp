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
    // Reset focus when search query changes
    useEffect(() => {
        setFocusedIndex(null);
    }, [searchQuery]);

    const handleArrowDown = useCallback(() => {
        if (focusedIndex === null) {
            if (navigableItems.length > 0) {
                setFocusedIndex("0");
                window.dispatchEvent(new Event('blurSearch'));
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
            } else {
                setFocusedIndex(null);
                window.dispatchEvent(new Event('focusSearch'));
            }
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
        setFocusedIndex(index);
        // Blur search if it's focused
        window.dispatchEvent(new Event('blurSearch'));
    }, []);

    return {
        focusedIndex,
        handleHover
    };
};
