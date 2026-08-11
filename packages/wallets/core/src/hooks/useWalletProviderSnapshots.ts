"use client";
import { useCallback, useRef, useSyncExternalStore } from "react";
import { useWalletProvidersRegistry } from "@/context/WalletProvidersRegistryProvider";
import type { WalletConnectionProvider } from "@/types/wallet";

const serverSnapshot: WalletConnectionProvider[] = [];

export function useWalletProviderSnapshots(): WalletConnectionProvider[] {
    const registry = useWalletProvidersRegistry();
    const cache = useRef<WalletConnectionProvider[]>([]);

    const getSnapshot = useCallback(() => {
        const current = registry.getEntries().map(entry => entry.store.getState());
        const previous = cache.current;
        if (previous.length === current.length && previous.every((value, index) => value === current[index])) {
            return previous;
        }
        cache.current = current;
        return current;
    }, [registry]);

    return useSyncExternalStore(registry.subscribe, getSnapshot, () => serverSnapshot);
}
