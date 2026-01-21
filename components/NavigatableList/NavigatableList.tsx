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
import NavigatableChildComponent from './NavigatableChild';

interface RegisteredItem {
    index: number;
    childCount: number;
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
        const items = sorted.map(item => ({ childCount: item.childCount }));
        const indexMap = new Map(sorted.map((item, idx) => [item.index, idx]));
        cachedSnapshot = { items, indexMap };
    };

    return {
        register(indexStr: string, childCount: number) {
            const index = parseInt(indexStr, 10);
            if (isNaN(index) || index < 0) return;

            const existing = registeredItems.get(index);
            if (!existing || existing.childCount !== childCount) {
                registeredItems.set(index, { index, childCount });
                rebuild();
                listeners.forEach(l => l());
            }
        },
        unregister() {
            // No-op: keeps navigation stable during virtualization scroll
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

    const registrationValue: NavigatableRegistrationContextType = useMemo(() => ({
        register: store.register,
        unregister: store.unregister,
        getNavigableIndex: (indexStr: string) => {
            const index = parseInt(indexStr, 10);
            return snapshot.indexMap.get(index) ?? -1;
        }
    }), [store, snapshot.indexMap]);

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
    Item: NavigatableItemComponent,
    Child: NavigatableChildComponent
});

export default NavigatableList;
