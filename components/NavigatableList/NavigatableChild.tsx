import React, { memo, useCallback, ReactNode, useRef, useEffect } from 'react';
import { useNavigatableListState, useNavigatableListUpdate } from './context';
import clsx from 'clsx';

export interface NavigatableChildProps {
    parentIndex: string;
    childIndex: number;
    children: ReactNode | ((props: { isFocused: boolean }) => ReactNode);
    onClick?: () => void;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    setRef?: (index: number, el: HTMLDivElement | null) => void;
    className?: string;
    focusedClassName?: string;
    tabIndex?: number;
}

const NavigatableChild = memo<NavigatableChildProps>(({
    parentIndex,
    childIndex,
    children,
    onClick,
    onKeyDown,
    setRef,
    className,
    focusedClassName,
    tabIndex = 0
}) => {
    const { focusedIndex } = useNavigatableListState();
    const { handleHover } = useNavigatableListUpdate();
    const internalRef = useRef<HTMLDivElement | null>(null);

    const fullIndex = `${parentIndex}.${childIndex}`;

    // Parse focused index to check if this child is focused
    const focusedParts = focusedIndex?.split('.') || [];
    const focusedParent = focusedParts[0] ? parseInt(focusedParts[0]) : -1;
    const focusedChild = focusedParts[1] !== undefined ? parseInt(focusedParts[1]) : undefined;

    const isFocused = focusedIndex !== null &&
                     focusedParent === parseInt(parentIndex) &&
                     focusedChild === childIndex;

    // Scroll into view when focused
    useEffect(() => {
        if (isFocused && internalRef.current) {
            internalRef.current.scrollIntoView({ block: 'nearest', behavior: 'auto' });
        }
    }, [isFocused]);

    const handleRef = useCallback((el: HTMLDivElement | null) => {
        internalRef.current = el;
        if (setRef) {
            setRef(childIndex, el);
        }
    }, [childIndex, setRef]);

    const handleClick = useCallback(() => {
        if (onClick) {
            onClick();
        }
    }, [onClick]);

    const handleKeyDownInternal = useCallback((e: React.KeyboardEvent) => {
        if (e.key === ' ') {
            e.preventDefault();
            if (onClick) {
                onClick();
            }
        }
        if (onKeyDown) {
            onKeyDown(e);
        }
    }, [onClick, onKeyDown]);

    const handleMouseEnter = useCallback(() => {
        handleHover(fullIndex);
    }, [handleHover, fullIndex]);

    return (
        <div
            ref={handleRef}
            data-nav-index={fullIndex}
            tabIndex={tabIndex}
            onClick={handleClick}
            onKeyDown={handleKeyDownInternal}
            onMouseEnter={handleMouseEnter}
            className={clsx(
                className,
                isFocused && focusedClassName
            )}
        >
            {typeof children === 'function' ? children({ isFocused }) : children}
        </div>
    );
});

NavigatableChild.displayName = 'NavigatableChild';

export default NavigatableChild;
