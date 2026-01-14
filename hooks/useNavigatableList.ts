import { useCallback, useState, useEffect } from 'react';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';

export interface NavigableItem {
    childCount?: number;
}

const parseIndex = (index: string): { parent: number; child?: number } => {
    const parts = index.split('.');
    return {
        parent: parseInt(parts[0]),
        child: parts[1] !== undefined ? parseInt(parts[1]) : undefined
    };
};

export interface UseNavigatableListOptions {
    navigableItems?: NavigableItem[];
    itemCount?: number;
    enabled?: boolean;
    onReset?: () => void;
    keyboardNavigatingClass?: string;
}

export const useNavigatableList = ({
    navigableItems: providedItems,
    itemCount,
    enabled = true,
    onReset,
    keyboardNavigatingClass = 'keyboard-navigating'
}: UseNavigatableListOptions) => {
    const [focusedIndex, setFocusedIndex] = useState<string | null>(null);
    const [isKeyboardNavigating, setIsKeyboardNavigating] = useState(false);
    const [isMouseMoving, setIsMouseMoving] = useState(false);

    // Create navigableItems from itemCount if provided, otherwise use providedItems
    const navigableItems = providedItems ?? (itemCount ? Array(itemCount).fill({ childCount: 0 }) : []);

    // Reset focus when onReset callback changes (e.g., search query changes)
    useEffect(() => {
        if (onReset) {
            onReset();
        }
        if (navigableItems.length > 0) {
            setFocusedIndex("0");
        } else {
            setFocusedIndex(null);
        }
    }, [onReset, navigableItems.length]);

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

        // If no focus, ArrowUp does nothing
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
        enabled
    );

    const handleHover = useCallback((index: string) => {
        // Only update on hover if mouse is actively moving (not keyboard navigating)
        if (!isMouseMoving) return;
        setFocusedIndex(index);
    }, [isMouseMoving]);

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
        handleHover,
        isKeyboardNavigating
    };
};
