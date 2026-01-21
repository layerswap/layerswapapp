import React, { forwardRef, ReactNode, useEffect, useContext } from 'react';
import { useNavigatableListState, NavigatableRegistrationContext } from './context';
import clsx from 'clsx';
import { useScrollIntoView, useSpaceKeyClick, useHoverHandler, useMergedRefs } from './hooks';

export interface NavigatableItemProps {
    /** Unique identifier for this item. Parsed as number for sorting. */
    index: string;
    /** Number of child items for accordion-style navigation. Auto-registered with NavigatableList. */
    childCount?: number;
    children: ReactNode | ((props: { isFocused: boolean }) => ReactNode);
    onClick?: () => void;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    onMouseEnter?: () => void;
    className?: string;
    focusedClassName?: string;
    tabIndex?: number;
}

const NavigatableItem = forwardRef<HTMLDivElement, NavigatableItemProps>(({
    index,
    childCount = 0,
    children,
    onClick,
    onKeyDown,
    onMouseEnter,
    className,
    focusedClassName,
    tabIndex = 0
}, ref) => {
    const { focusedIndex } = useNavigatableListState();
    const registrationContext = useContext(NavigatableRegistrationContext);

    // Auto-register this item with the NavigatableList
    useEffect(() => {
        if (registrationContext && index !== "-1") {
            registrationContext.register(index, childCount);
            return () => registrationContext.unregister(index);
        }
    }, [index, childCount, registrationContext]);

    // Get the computed navigable index from registration
    const navigableIndex = registrationContext?.getNavigableIndex(index) ?? -1;
    const effectiveIndex = navigableIndex >= 0 ? navigableIndex.toString() : index;

    // Check if this item is focused
    // Item is focused if focusedIndex matches this index exactly and index is a parent (no dot)
    const isFocused = focusedIndex !== null &&
                     focusedIndex === effectiveIndex &&
                     effectiveIndex.indexOf('.') === -1;

    // Use shared hooks
    const itemRef = useScrollIntoView(isFocused);
    const handleKeyDownInternal = useSpaceKeyClick(onClick, onKeyDown);
    const handleMouseEnterInternal = useHoverHandler(effectiveIndex, onMouseEnter);
    const setRefs = useMergedRefs(itemRef, ref);

    return (
        <div
            ref={setRefs}
            data-nav-index={effectiveIndex}
            tabIndex={tabIndex}
            onClick={onClick}
            onKeyDown={handleKeyDownInternal}
            onMouseEnter={handleMouseEnterInternal}
            className={clsx(
                className,
                isFocused && focusedClassName
            )}
        >
            {typeof children === 'function' ? children({ isFocused }) : children}
        </div>
    );
});

NavigatableItem.displayName = 'NavigatableItem';

export default NavigatableItem;
