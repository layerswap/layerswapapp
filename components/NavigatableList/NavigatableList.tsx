import React, { ReactNode, useMemo } from 'react';
import { useNavigatableList, NavigableItem } from '@/hooks/useNavigatableList';
import {
    NavigatableListStateContext,
    NavigatableListUpdateContext,
    NavigatableListStateContextType,
    NavigatableListUpdateContextType
} from './context';
import NavigatableItemComponent from './NavigatableItem';
import NavigatableChildComponent from './NavigatableChild';

export interface NavigatableListProps {
    children: ReactNode;
    navigableItems?: NavigableItem[];
    itemCount?: number;
    enabled?: boolean;
    onReset?: () => void;
    keyboardNavigatingClass?: string;
}

function NavigatableListRoot({
    children,
    navigableItems,
    itemCount,
    enabled = true,
    onReset,
    keyboardNavigatingClass = 'keyboard-navigating'
}: NavigatableListProps) {
    const { focusedIndex, handleHover, isKeyboardNavigating } = useNavigatableList({
        navigableItems,
        itemCount,
        enabled,
        onReset,
        keyboardNavigatingClass
    });

    const stateValue: NavigatableListStateContextType = useMemo(() => ({
        focusedIndex,
        isKeyboardNavigating
    }), [focusedIndex, isKeyboardNavigating]);

    const updateValue: NavigatableListUpdateContextType = useMemo(() => ({
        handleHover
    }), [handleHover]);

    return (
        <NavigatableListStateContext.Provider value={stateValue}>
            <NavigatableListUpdateContext.Provider value={updateValue}>
                {children}
            </NavigatableListUpdateContext.Provider>
        </NavigatableListStateContext.Provider>
    );
}

// Compound component pattern - attach sub-components as static properties
const NavigatableList = Object.assign(NavigatableListRoot, {
    Item: NavigatableItemComponent,
    Child: NavigatableChildComponent
});

export default NavigatableList;
