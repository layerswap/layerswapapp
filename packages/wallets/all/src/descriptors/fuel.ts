import type { WalletProviderDescriptor } from "@layerswap/wallet-core/types"
import type { WalletProvider } from "@layerswap/wallet-core/types"

const FUEL_NETWORKS = ['FUEL_MAINNET', 'FUEL_TESTNET', 'FUEL_DEVNET']

/**
 * Tree-shake-safe stand-in for `createFuelProvider`. Defers `@fuel-ts/*` +
 * `@fuels/vm-asm` — ~373 KB parsed / ~116 KB gzip — out of the host's entry
 * chunk.
 */
export function createFuelDescriptor(): WalletProviderDescriptor {
    return {
        id: 'fuel',
        name: 'Fuel',
        autofillSupportedNetworks: FUEL_NETWORKS,
        withdrawalSupportedNetworks: FUEL_NETWORKS,
        asSourceSupportedNetworks: FUEL_NETWORKS,
        loadProvider: async (): Promise<WalletProvider> => {
            const mod = await import('@layerswap/wallet-fuel')
            return mod.createFuelProvider()
        },
    }
}
