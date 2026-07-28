import React from 'react';

// Structured index type - eliminates string parsing
export type FocusedIndex = 
    | { parent: number; child?: undefined }
    | { parent: number; child: number };

// Helper to check equality between two focused indexes
export function focusedIndexEquals(a: FocusedIndex | null, b: FocusedIndex | null): boolean {
    if (a === null || b === null) return a === b;
    return a.parent === b.parent && a.child === b.child;
}

// Convert to string for DOM data-attribute (needed for querySelector)
export function focusedIndexToString(idx: FocusedIndex): string {
    return idx.child !== undefined ? `${idx.parent}.${idx.child}` : `${idx.parent}`;
}

export interface NavigatableListStateContextType {
    focusedIndex: FocusedIndex | null;
    isKeyboardNavigating: boolean;
}

export interface NavigatableListUpdateContextType {
    handleHover: (index: FocusedIndex) => void;
    handleFocus: () => void;
}

export interface NavigatableRegistrationContextType {
    register: (id: number) => void;
    unregister: (id: number) => void;
    registerChild: (parentId: number, childIndex: number) => void;
    unregisterChild: (parentId: number, childIndex: number) => void;
    getNavigableIndex: (id: number) => number;
    registerClickHandler: (index: FocusedIndex, handler: () => void) => void;
    unregisterClickHandler: (index: FocusedIndex) => void;
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
