import React from 'react';

export interface NavigatableListStateContextType {
    focusedIndex: string | null;
    isKeyboardNavigating: boolean;
}

export interface NavigatableListUpdateContextType {
    handleHover: (index: string) => void;
}

export interface NavigatableRegistrationContextType {
    register: (id: string, childCount: number) => void;
    unregister: (id: string) => void;
    getNavigableIndex: (id: string) => number;
}

export const NavigatableListStateContext = React.createContext<NavigatableListStateContextType | null>(null);
export const NavigatableListUpdateContext = React.createContext<NavigatableListUpdateContextType | null>(null);
export const NavigatableRegistrationContext = React.createContext<NavigatableRegistrationContextType | null>(null);

export function useNavigatableListState() {
    const context = React.useContext(NavigatableListStateContext);
    if (context === null) {
        throw new Error('useNavigatableListState must be used within a NavigatableList');
    }
    return context;
}

export function useNavigatableListUpdate() {
    const context = React.useContext(NavigatableListUpdateContext);
    if (context === null) {
        throw new Error('useNavigatableListUpdate must be used within a NavigatableList');
    }
    return context;
}

export function useNavigatableRegistration() {
    const context = React.useContext(NavigatableRegistrationContext);
    if (context === null) {
        throw new Error('useNavigatableRegistration must be used within a NavigatableList');
    }
    return context;
}
