import React, { forwardRef, useRef, useEffect, ReactNode } from 'react';
import { useNavigatableListState, useNavigatableListUpdate } from './context';
import clsx from 'clsx';

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
    const { handleHover } = useNavigatableListUpdate();
    const itemRef = useRef<HTMLDivElement | null>(null);

    // Check if this item is focused
    // Item is focused if focusedIndex matches this index exactly and index is a parent (no dot)
    const isFocused = focusedIndex !== null &&
                     focusedIndex === index &&
                     index.indexOf('.') === -1;

    // Scroll into view when focused
    useEffect(() => {
        if (isFocused && itemRef.current) {
            itemRef.current.scrollIntoView({ block: 'nearest', behavior: 'auto' });
        }
    }, [isFocused]);

    // Merge refs (local + forwarded)
    const setRefs = (el: HTMLDivElement | null) => {
        itemRef.current = el;
        if (typeof ref === 'function') {
            ref(el);
        } else if (ref && 'current' in ref) {
            (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
        }
    };

    const handleMouseEnterInternal = () => {
        handleHover(index);
        if (onMouseEnter) {
            onMouseEnter();
        }
    };

    const handleKeyDownInternal = (e: React.KeyboardEvent) => {
        if (e.key === ' ') {
            e.preventDefault();
            if (onClick) {
                onClick();
            }
        }
        if (onKeyDown) {
            onKeyDown(e);
        }
    };

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
