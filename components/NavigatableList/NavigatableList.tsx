import React, { ReactNode, useMemo, useRef } from 'react';
import { useSyncExternalStore } from 'react';
import { useNavigatableList, NavigableItem } from '@/hooks/useNavigatableList';
import {
    NavigatableListStateContext,
    NavigatableListUpdateContext,
    NavigatableRegistrationContext,
    NavigatableListStateContextType,
    NavigatableListUpdateContextType,
    NavigatableRegistrationContextType
} from './context';
import NavigatableItemComponent from './NavigatableItem';

interface RegisteredItem {
    index: number;
    children: Set<number>;
}

interface StoreSnapshot {
    items: NavigableItem[];
    indexMap: Map<number, number>;
}

function createAutoDetectionStore() {
    let registeredItems = new Map<number, RegisteredItem>();
    let listeners = new Set<() => void>();
    let cachedSnapshot: StoreSnapshot = { items: [], indexMap: new Map() };

    const rebuild = () => {
        const sorted = Array.from(registeredItems.values()).sort((a, b) => a.index - b.index);
        const items = sorted.map(item => ({ childCount: item.children.size }));
        const indexMap = new Map(sorted.map((item, idx) => [item.index, idx]));
        cachedSnapshot = { items, indexMap };
    };

    return {
        register(indexStr: string) {
            const index = parseInt(indexStr, 10);
            if (isNaN(index) || index < 0) return;

            if (!registeredItems.has(index)) {
                registeredItems.set(index, { index, children: new Set() });
                rebuild();
                listeners.forEach(l => l());
            }
        },
        unregister() {
            // No-op: keeps navigation stable during virtualization scroll
        },
        registerChild(parentIndexStr: string, childIndex: number) {
            const parentIndex = parseInt(parentIndexStr, 10);
            if (isNaN(parentIndex) || parentIndex < 0) return;

            let parent = registeredItems.get(parentIndex);
            if (!parent) {
                // Auto-register parent if it doesn't exist yet
                parent = { index: parentIndex, children: new Set() };
                registeredItems.set(parentIndex, parent);
            }

            if (!parent.children.has(childIndex)) {
                parent.children.add(childIndex);
                rebuild();
                listeners.forEach(l => l());
            }
        },
        unregisterChild(parentIndexStr: string, childIndex: number) {
            const parentIndex = parseInt(parentIndexStr, 10);
            if (isNaN(parentIndex) || parentIndex < 0) return;

            const parent = registeredItems.get(parentIndex);
            if (parent && parent.children.has(childIndex)) {
                parent.children.delete(childIndex);
                rebuild();
                listeners.forEach(l => l());
            }
        },
        getNavigableIndex(indexStr: string): number {
            const index = parseInt(indexStr, 10);
            return cachedSnapshot.indexMap.get(index) ?? -1;
        },
        getSnapshot(): StoreSnapshot {
            return cachedSnapshot;
        },
        subscribe(listener: () => void) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        }
    };
}

export interface NavigatableListProps {
    children: ReactNode;
    /** @deprecated Items auto-register now. Only use for manual override. */
    navigableItems?: NavigableItem[];
    /** @deprecated Items auto-register now. Only use for manual override. */
    itemCount?: number;
    enabled?: boolean;
    onReset?: () => void;
    keyboardNavigatingClass?: string;
}

function NavigatableListRoot({
    children,
    navigableItems: providedNavigableItems,
    itemCount,
    enabled = true,
    onReset,
    keyboardNavigatingClass = 'keyboard-navigating'
}: NavigatableListProps) {
    const storeRef = useRef<ReturnType<typeof createAutoDetectionStore>>();
    if (!storeRef.current) {
        storeRef.current = createAutoDetectionStore();
    }
    const store = storeRef.current;

    const snapshot = useSyncExternalStore(
        store.subscribe,
        store.getSnapshot,
        store.getSnapshot
    );

    // Use provided items or auto-detected items
    const navigableItems = providedNavigableItems ?? (itemCount ? Array(itemCount).fill({ childCount: 0 }) : snapshot.items);

    const { focusedIndex, handleHover, isKeyboardNavigating } = useNavigatableList({
        navigableItems,
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

    // Registration context is stable - functions read from store directly
    const registrationValue: NavigatableRegistrationContextType = useMemo(() => ({
        register: store.register,
        unregister: store.unregister,
        registerChild: store.registerChild,
        unregisterChild: store.unregisterChild,
        getNavigableIndex: store.getNavigableIndex
    }), [store]);

    return (
        <NavigatableRegistrationContext.Provider value={registrationValue}>
            <NavigatableListStateContext.Provider value={stateValue}>
                <NavigatableListUpdateContext.Provider value={updateValue}>
                    {children}
                </NavigatableListUpdateContext.Provider>
            </NavigatableListStateContext.Provider>
        </NavigatableRegistrationContext.Provider>
    );
}

// Compound component pattern - attach sub-components as static properties
const NavigatableList = Object.assign(NavigatableListRoot, {
    Item: NavigatableItemComponent
});

export default NavigatableList;