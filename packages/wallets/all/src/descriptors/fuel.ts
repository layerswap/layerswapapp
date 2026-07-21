import type { WalletProviderDescriptor } from "@layerswap/widget/types"
import { defineWalletDescriptor } from "./defineWalletDescriptor"
import { hasStorageKey } from "./persistedSession"

const FUEL_NETWORKS = ['FUEL_MAINNET', 'FUEL_TESTNET', 'FUEL_DEVNET']

/**
 * Tree-shake-safe stand-in for `createFuelProvider`. Defers `@fuel-ts/*` +
 * `@fuels/vm-asm` — ~373 KB parsed / ~116 KB gzip — out of the host's entry
 * chunk.
 */
export function createFuelDescriptor(): WalletProviderDescriptor {
    return defineWalletDescriptor({
        id: 'fuel',
        name: 'Fuel',
        autofillSupportedNetworks: FUEL_NETWORKS,
        withdrawalSupportedNetworks: FUEL_NETWORKS,
        asSourceSupportedNetworks: FUEL_NETWORKS,
        // `Fuel.STORAGE_KEY` in @fuel-ts/account — written once a fuel
        // connector was detected as installed, so hydration only triggers
        // for users who actually have a Fuel-family extension.
        hasPersistedSession: () => hasStorageKey('fuel-current-connector'),
        loadProvider: async () => {
            const mod = await import('@layerswap/wallet-fuel')
            return mod.createFuelProvider()
        },
    })
}
