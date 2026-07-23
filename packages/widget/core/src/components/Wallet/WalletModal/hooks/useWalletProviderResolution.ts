import { useCallback, useRef } from "react";
import type { WalletConnectionProvider } from "@/types/wallet";
import { connectorKey } from "@/hooks/useConnectors";
import {
    areWalletProvidersSettled,
    useWalletProvidersRegistry,
} from "@/context/walletProviders";
import { useWalletDescriptorLoader } from "@/lib/walletConnect/walletDescriptorLoader";

const PROVIDER_SETTLE_TIMEOUT_MS = 5000;

export function useWalletProviderResolution(
    featuredProviders: WalletConnectionProvider[],
) {
    const registry = useWalletProvidersRegistry();
    const { loadAll, loadById } = useWalletDescriptorLoader();
    const featuredProvidersRef = useRef(featuredProviders);
    featuredProvidersRef.current = featuredProviders;

    const providersAreSettled = useCallback(
        () => areWalletProvidersSettled(registry),
        [registry],
    );

    const liveVariantCount = useCallback(
        (name: string) => {
            const key = connectorKey(name);
            const featuredProviderIds = new Set(
                featuredProvidersRef.current.map((provider) => provider.id),
            );

            return registry.getEntries().filter((entry) => {
                if (!featuredProviderIds.has(entry.id)) return false;
                const state = entry.store.getState();
                return [
                    ...(state.availableConnectors ?? []),
                    ...(state.additionalConnectors ?? []),
                ].some((candidate) => connectorKey(candidate.name) === key);
            }).length;
        },
        [registry],
    );

    const awaitProvidersSettled = useCallback(
        async (timeoutMs = PROVIDER_SETTLE_TIMEOUT_MS): Promise<boolean> => {
            await loadAll();
            const settled = () => areWalletProvidersSettled(registry);
            if (settled()) return true;

            return new Promise<boolean>((resolve) => {
                let unsubscribe = () => {};
                const finish = (didSettle: boolean) => {
                    clearTimeout(timer);
                    unsubscribe();
                    resolve(didSettle);
                };
                const timer = setTimeout(() => finish(false), timeoutMs);
                unsubscribe = registry.subscribe(() => {
                    if (settled()) finish(true);
                });
            });
        },
        [loadAll, registry],
    );

    const awaitLiveProvider = useCallback(
        async (
            providerId: string,
            timeoutMs = PROVIDER_SETTLE_TIMEOUT_MS,
        ): Promise<WalletConnectionProvider | undefined> => {
            void loadById(providerId);
            const getLiveProvider = () => {
                const state = registry
                    .getEntries()
                    .find((entry) => entry.id === providerId)
                    ?.store.getState();
                return state && !state.isStub && state.ready
                    ? state
                    : undefined;
            };
            const current = getLiveProvider();
            if (current) return current;

            return new Promise((resolve) => {
                let unsubscribe = () => {};
                const finish = () => {
                    clearTimeout(timer);
                    unsubscribe();
                    resolve(getLiveProvider());
                };
                const timer = setTimeout(finish, timeoutMs);
                unsubscribe = registry.subscribe(() => {
                    if (getLiveProvider()) finish();
                });
            });
        },
        [loadById, registry],
    );

    return {
        awaitLiveProvider,
        awaitProvidersSettled,
        liveVariantCount,
        providersAreSettled,
    };
}
