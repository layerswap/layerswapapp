import type { WalletProviderDescriptor } from "@layerswap/wallet-core/types"

/**
 * Keeps descriptor creation typed without importing any chain SDK at module
 * load time. Runtime provider IDs are validated by the registry when the
 * descriptor resolves.
 */
export function defineWalletDescriptor<T extends WalletProviderDescriptor>(
    descriptor: T,
): T {
    return descriptor
}
