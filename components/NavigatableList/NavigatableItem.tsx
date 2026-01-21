import React, { forwardRef, ReactNode, useEffect, useContext, useCallback, memo } from 'react';
import { useNavigatableListState, NavigatableRegistrationContext } from './context';
import clsx from 'clsx';
import { useScrollIntoView, useSpaceKeyClick, useHoverHandler, useMergedRefs } from './hooks';

export interface NavigatableItemProps {
    /**
     * Unique identifier for this item.
     * For parent items: parsed as number for sorting (e.g., "0", "1", "2")
     * For child items: the child's index within the parent (e.g., 0, 1, 2)
     */
    index: string | number;
    /**
     * When provided, this item becomes a child of the parent with this index.
     * The parent's original index (not navigable index) should be passed.
     */
    parentIndex?: string;
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
    const indexStr = String(index);
    const childIndex = isChild ? (typeof index === 'number' ? index : parseInt(index, 10)) : -1;

    // Auto-register this item with the NavigatableList
    useEffect(() => {
        if (!registrationContext) return;

        if (isChild) {
            // Register as child
            registrationContext.registerChild(parentIndex, childIndex);
            return () => registrationContext.unregisterChild(parentIndex, childIndex);
        } else if (indexStr !== "-1") {
            // Register as parent
            registrationContext.register(indexStr);
            return () => registrationContext.unregister(indexStr);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [indexStr, parentIndex, childIndex, isChild]);

    // Compute effective index for navigation
    let effectiveIndex: string;
    let isFocused: boolean;

    if (isChild) {
        // Child item: compute full index as "parentNavigableIndex.childIndex"
        const parentNavigableIndex = registrationContext?.getNavigableIndex(parentIndex) ?? -1;
        const effectiveParentIndex = parentNavigableIndex >= 0 ? parentNavigableIndex.toString() : parentIndex;
        effectiveIndex = `${effectiveParentIndex}.${childIndex}`;

        // Check if this child is focused
        const focusedParts = focusedIndex?.split('.') || [];
        const focusedParent = focusedParts[0] ? parseInt(focusedParts[0]) : -1;
        const focusedChild = focusedParts[1] !== undefined ? parseInt(focusedParts[1]) : undefined;

        isFocused = focusedIndex !== null &&
                    focusedParent === parseInt(effectiveParentIndex) &&
                    focusedChild === childIndex;
    } else {
        // Parent item: use navigable index
        const navigableIndex = registrationContext?.getNavigableIndex(indexStr) ?? -1;
        effectiveIndex = navigableIndex >= 0 ? navigableIndex.toString() : indexStr;

        // Parent is focused if focusedIndex matches exactly and has no dot (not a child)
        isFocused = focusedIndex !== null &&
                    focusedIndex === effectiveIndex &&
                    effectiveIndex.indexOf('.') === -1;
    }

    // Use shared hooks
    const itemRef = useScrollIntoView(isFocused);
    const handleKeyDownInternal = useSpaceKeyClick(onClick, onKeyDown);
    const handleMouseEnterInternal = useHoverHandler(effectiveIndex, onMouseEnter);
    const setRefs = useMergedRefs(itemRef, ref);

    const handleClick = useCallback(() => {
        if (onClick) {
            onClick();
        }
    }, [onClick]);

    return (
        <div
            ref={setRefs}
            data-nav-index={effectiveIndex}
            tabIndex={tabIndex}
            onClick={handleClick}
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

NavigatableItemInner.displayName = 'NavigatableItem';

// Memo wrapper to prevent re-renders from parent component updates
// Note: This doesn't prevent re-renders from context changes, but helps with parent list re-renders
const NavigatableItem = memo(NavigatableItemInner);

export default NavigatableItem;
