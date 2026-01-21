import React, { memo, useCallback, ReactNode, useContext } from 'react';
import { useNavigatableListState, NavigatableRegistrationContext } from './context';
import clsx from 'clsx';
import { useScrollIntoView, useSpaceKeyClick, useHoverHandler, useMergedRefs } from './hooks';

export interface NavigatableChildProps {
    /** Parent item's index (the original index passed to NavigatableItem) */
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
    const registrationContext = useContext(NavigatableRegistrationContext);

    // Get the computed navigable index for the parent
    const parentNavigableIndex = registrationContext?.getNavigableIndex(parentIndex) ?? -1;
    const effectiveParentIndex = parentNavigableIndex >= 0 ? parentNavigableIndex.toString() : parentIndex;

    const fullIndex = `${effectiveParentIndex}.${childIndex}`;

    // Parse focused index to check if this child is focused
    const focusedParts = focusedIndex?.split('.') || [];
    const focusedParent = focusedParts[0] ? parseInt(focusedParts[0]) : -1;
    const focusedChild = focusedParts[1] !== undefined ? parseInt(focusedParts[1]) : undefined;

    const isFocused = focusedIndex !== null &&
                     focusedParent === parseInt(effectiveParentIndex) &&
                     focusedChild === childIndex;

    // Use shared hooks
    const internalRef = useScrollIntoView(isFocused);
    const handleKeyDownInternal = useSpaceKeyClick(onClick, onKeyDown);
    const handleMouseEnter = useHoverHandler(fullIndex);

    const handleClick = useCallback(() => {
        if (onClick) {
            onClick();
        }
    }, [onClick]);

    // Merge internal ref with setRef callback
    const handleRef = useMergedRefs(
        internalRef,
        useCallback((el: HTMLDivElement | null) => {
            if (setRef) {
                setRef(childIndex, el);
            }
        }, [childIndex, setRef])
    );

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
