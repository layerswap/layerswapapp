import React, { forwardRef, ReactNode } from 'react';
import { useNavigatableListState } from './context';
import clsx from 'clsx';
import { useScrollIntoView, useSpaceKeyClick, useHoverHandler, useMergedRefs } from './hooks';

export interface NavigatableItemProps {
    index: string;
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
    children,
    onClick,
    onKeyDown,
    onMouseEnter,
    className,
    focusedClassName,
    tabIndex = 0
}, ref) => {
    const { focusedIndex } = useNavigatableListState();

    // Check if this item is focused
    // Item is focused if focusedIndex matches this index exactly and index is a parent (no dot)
    const isFocused = focusedIndex !== null &&
                     focusedIndex === index &&
                     index.indexOf('.') === -1;

    // Use shared hooks
    const itemRef = useScrollIntoView(isFocused);
    const handleKeyDownInternal = useSpaceKeyClick(onClick, onKeyDown);
    const handleMouseEnterInternal = useHoverHandler(index, onMouseEnter);
    const setRefs = useMergedRefs(itemRef, ref);

    return (
        <div
            ref={setRefs}
            data-nav-index={index}
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
