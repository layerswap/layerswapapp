import React, { ReactNode, useMemo, useRef, useEffect, useState } from 'react';
import { useSyncExternalStore } from 'react';
import { useNavigatableList, NavigableItem } from '@/hooks/useNavigatableList';
import {
    NavigatableListStateContext,
    NavigatableListUpdateContext,
    NavigatableRegistrationContext,
    NavigatableListStateContextType,
    NavigatableListUpdateContextType,
    NavigatableRegistrationContextType,
    focusedIndexToString
} from './context';
import NavigatableItemComponent from './NavigatableItem';

interface RegisteredItem {
    children: Set<number>;
    version: number;
}

interface StoreSnapshot {
    items: NavigableItem[];
    indexMap: Map<number, number>;
}

function createAutoDetectionStore() {
    let registeredItems = new Map<number, RegisteredItem>();
    let clickHandlers = new Map<string, () => void>();
    let listeners = new Set<() => void>();
    let cachedSnapshot: StoreSnapshot = { items: [], indexMap: new Map() };
    let currentVersion = 0;

    const rebuild = () => {
        const sorted = Array.from(registeredItems.entries())
            .filter(([, item]) => item.version === currentVersion)
            .sort((a, b) => a[0] - b[0]);
        const items = sorted.map(([, item]) => ({ childCount: item.children.size }));
        const indexMap = new Map(sorted.map(([originalIndex], idx) => [originalIndex, idx]));
        cachedSnapshot = { items, indexMap };
    };

    return {
        register(index: number) {
            if (index < 0) return;
            const existing = registeredItems.get(index);
            if (existing) {
                if (existing.version === currentVersion) return;
                existing.version = currentVersion;
                existing.children = new Set();
            } else {
                registeredItems.set(index, { children: new Set(), version: currentVersion });
            }
            rebuild();
            listeners.forEach(l => l());
        },
        unregister() {
            // No-op: keeps navigation stable during virtual scroll.
            // Phantom items from old search views are handled by version filtering.
        },
        incrementVersion() {
            currentVersion++;
            rebuild();
            listeners.forEach(l => l());
        },
        registerChild(parentIndex: number, childIndex: number) {
            if (parentIndex < 0) return;

            let parent = registeredItems.get(parentIndex);
            if (!parent) {
                parent = { children: new Set(), version: currentVersion };
                registeredItems.set(parentIndex, parent);
            }

            if (!parent.children.has(childIndex)) {
                parent.children.add(childIndex);
                rebuild();
                listeners.forEach(l => l());
            }
        },
        unregisterChild(parentIndex: number, childIndex: number) {
            if (parentIndex < 0) return;

            const parent = registeredItems.get(parentIndex);
            if (parent && parent.children.has(childIndex)) {
                parent.children.delete(childIndex);
                rebuild();
                listeners.forEach(l => l());
            }
        },
        getNavigableIndex(index: number): number {
            return cachedSnapshot.indexMap.get(index) ?? -1;
        },
        registerClickHandler(index: { parent: number; child?: number }, handler: () => void) {
            clickHandlers.set(focusedIndexToString(index), handler);
        },
        unregisterClickHandler(index: { parent: number; child?: number }) {
            clickHandlers.delete(focusedIndexToString(index));
        },
        triggerClickByKey(key: string) {
            const handler = clickHandlers.get(key);
            if (handler) handler();
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
    enabled?: boolean;
    onReset?: () => void;
    keyboardNavigatingClass?: string;
    navigateToFirstChild?: boolean;
}

function NavigatableListRoot({
    children,
    enabled = true,
    onReset,
    keyboardNavigatingClass = 'keyboard-navigating',
    navigateToFirstChild
}: NavigatableListProps) {
    const storeRef = useRef<ReturnType<typeof createAutoDetectionStore>>();
    if (!storeRef.current) {
        storeRef.current = createAutoDetectionStore();
    }
    const store = storeRef.current;

    // Incremented when search changes — causes visible NavigatableItems to re-register
    // with the new version, filtering out phantom items from the previous view.
    const [registrationVersion, setRegistrationVersion] = useState(0);

    const snapshot = useSyncExternalStore(
        store.subscribe,
        store.getSnapshot,
        store.getSnapshot
    );

    const { focusedIndex, handleHover, handleFocus, isKeyboardNavigating } = useNavigatableList({
        navigableItems: snapshot.items,
        enabled,
        onReset,
        keyboardNavigatingClass,
        onEnter: store.triggerClickByKey,
        navigateToFirstChild
    });

    const isFirstRenderRef = useRef(true);
    useEffect(() => {
        if (isFirstRenderRef.current) {
            isFirstRenderRef.current = false;
            return;
        }
        store.incrementVersion();
        setRegistrationVersion(v => v + 1);
    }, [onReset]);

    const stateValue: NavigatableListStateContextType = useMemo(() => ({
        focusedIndex,
        isKeyboardNavigating
    }), [focusedIndex, isKeyboardNavigating]);

    const updateValue: NavigatableListUpdateContextType = useMemo(() => ({
        handleHover,
        handleFocus
    }), [handleHover, handleFocus]);

    // registrationVersion in deps causes a new context object on each version bump,
    // which triggers re-registration effects in all visible NavigatableItems.
    const registrationValue: NavigatableRegistrationContextType = useMemo(() => ({
        register: store.register,
        unregister: store.unregister,
        registerChild: store.registerChild,
        unregisterChild: store.unregisterChild,
        getNavigableIndex: store.getNavigableIndex,
        registerClickHandler: store.registerClickHandler,
        unregisterClickHandler: store.unregisterClickHandler
    }), [store, registrationVersion]); // eslint-disable-line react-hooks/exhaustive-deps

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
