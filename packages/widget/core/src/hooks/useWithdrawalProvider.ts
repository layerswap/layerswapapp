import type { Network } from '@layerswap/widget-types';
import { useSyncExternalStore } from 'react';
import { useWalletProvidersRegistry } from '@layerswap/wallet-core';
import { resolverService } from '@/lib/resolvers/resolverService';

export function useWithdrawalProvider(network: Network | undefined) {
    const registry = useWalletProvidersRegistry();
    // Reuse wallet registration updates; connection-state changes keep the same entries.
    const entries = useSyncExternalStore(registry.subscribe, registry.getEntries, registry.getEntries);
    if (!network || entries.length === 0) {
        return undefined;
    }
    return resolverService.getTransferResolver().getWithdrawalProvider(network);
}
