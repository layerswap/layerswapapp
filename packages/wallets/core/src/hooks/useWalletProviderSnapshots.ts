"use client";
import { useCallback, useRef, useSyncExternalStore } from "react";
import { useWalletProvidersRegistry } from "@/context/WalletProvidersRegistryProvider";
import type { WalletConnectionProvider } from "@/types/wallet";

// Stable reference for SSR — `useSyncExternalStore` requires `getServerSnapshot`
// to return the same value across calls, otherwise it triggers infinite renders.
// Wallet providers aren't populated on the server, so an empty list is correct.
const serverSnapshot: WalletConnectionProvider[] = [];
const getServerSnapshot = () => serverSnapshot;

/**
 * Subscribes to the registry plus every contained store via a single
 * `useSyncExternalStore` call. The registry already fans-out inner store
 * notifications, so one subscribe is enough. The cached array keeps the
 * snapshot reference stable when nothing changed, so downstream `useMemo`s
 * stay cache-effective.
 */
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

    return useSyncExternalStore(registry.subscribe, getSnapshot, getServerSnapshot);
}
