import React, { forwardRef, ReactNode, useEffect, useContext, useCallback, memo, useRef } from 'react';
import { useNavigatableListState, NavigatableRegistrationContext, FocusedIndex, focusedIndexEquals, focusedIndexToString } from './context';
import clsx from 'clsx';
import { useScrollIntoView, useSpaceKeyClick, useHoverHandler, useFocusHandler, useMergedRefs } from './hooks';

export interface NavigatableItemProps {
    /**
     * Unique identifier for this item (as a number).
     * For child items: the child's index within the parent (e.g., 0, 1, 2)
     */
    index: number;
    /**
     * When provided, this item becomes a child of the parent with this index.
     * The parent's original index (not navigable index) should be passed.
     */
    parentIndex?: number;
    children: ReactNode | ((props: { isFocused: boolean }) => ReactNode);
    onClick?: () => void;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    onMouseEnter?: () => void;
    className?: string;
    focusedClassName?: string;
    tabIndex?: number;
}

const NavigatableItemInner = forwardRef<HTMLDivElement, NavigatableItemProps>(({
    index,
    parentIndex,
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

    const isChild = parentIndex !== undefined;

    // Compute effective index for navigation (no memoization - must recalculate on each render
    // because registrationContext is a stable ref but its internal state changes)
    let effectiveIndex: FocusedIndex;
    if (isChild) {
        // Child item: get the parent's navigable index
        const parentNavigableIndex = registrationContext?.getNavigableIndex(parentIndex) ?? -1;
        const effectiveParent = parentNavigableIndex >= 0 ? parentNavigableIndex : parentIndex;
        effectiveIndex = { parent: effectiveParent, child: index };
    } else {
        // Parent item: use navigable index
        const navigableIndex = registrationContext?.getNavigableIndex(index) ?? -1;
        effectiveIndex = { parent: navigableIndex >= 0 ? navigableIndex : index };
    }

    // Auto-register this item with the NavigatableList
    useEffect(() => {
        if (!registrationContext) return;

        if (isChild) {
            // Register as child
            registrationContext.registerChild(parentIndex, index);
            return () => registrationContext.unregisterChild(parentIndex, index);
        } else if (index >= 0) {
            // Register as parent (no cleanup - unregister is no-op for virtualization stability)
            registrationContext.register(index);
        }
    }, [index, parentIndex, isChild, registrationContext]);

    // Use ref for onClick to avoid re-registering handler when callback identity changes
    const onClickRef = useRef(onClick);
    useEffect(() => {
        onClickRef.current = onClick;
    }, [onClick]);

    // Register click handler for Enter key navigation (avoids DOM querySelector)
    // Handler wrapper reads from ref, so we only need to register once per index
    useEffect(() => {
        if (!registrationContext) return;

        const handler = () => onClickRef.current?.();
        registrationContext.registerClickHandler(effectiveIndex, handler);
        return () => registrationContext.unregisterClickHandler(effectiveIndex);
    }, [effectiveIndex.parent, effectiveIndex.child, registrationContext]);

    // Check if this item is focused using structured comparison
    const isFocused = focusedIndexEquals(focusedIndex, effectiveIndex);

    // Convert to string only for DOM data-attribute
    const dataNavIndex = focusedIndexToString(effectiveIndex);

    // Use shared hooks
    const itemRef = useScrollIntoView(isFocused);
    const handleKeyDownInternal = useSpaceKeyClick(onClick, onKeyDown);
    const handleMouseEnterInternal = useHoverHandler(effectiveIndex, onMouseEnter);
    const handleFocusInternal = useFocusHandler();
    const setRefs = useMergedRefs(itemRef, ref);

    const handleClick = useCallback(() => {
        if (onClick) {
            onClick();
        }
    }, [onClick]);

    return (
        <div
            ref={setRefs}
            data-nav-index={dataNavIndex}
            tabIndex={tabIndex}
            onClick={handleClick}
            onKeyDown={handleKeyDownInternal}
            onMouseEnter={handleMouseEnterInternal}
            onFocus={handleFocusInternal}
            className={clsx(
                className,
                isFocused && focusedClassName
            )}
        >
            {typeof children === 'function' ? children({ isFocused }) : children}
        </div>
    );
});

NavigatableItemInner.displayName = 'NavigatableItem';

// Memo wrapper to prevent re-renders from parent component updates
// Note: This doesn't prevent re-renders from context changes, but helps with parent list re-renders
const NavigatableItem = memo(NavigatableItemInner);

export default NavigatableItem;
