import type { WalletProviderDescriptor } from "@layerswap/widget/types"
import { defineWalletDescriptor } from "./defineWalletDescriptor"
import { readStorageJson } from "./persistedSession"

// Inlined — importing Paradex's runtime constants drags `starknet` (~884 KB
// parsed) into the host entry chunk. Keep in sync with the
// `ParadexMainnet`/`ParadexTestnet` entries in widget's `knownIds.ts`.
const PARADEX_NETWORKS = ['PARADEX_MAINNET', 'PARADEX_TESTNET']

/**
 * Tree-shake-safe stand-in for `createParadexProvider` — defers
 * `@paradex/sdk` → `starknet` out of the host's entry chunk.
 */
export function createParadexDescriptor(): WalletProviderDescriptor {
    return defineWalletDescriptor({
        id: 'paradex',
        name: 'Paradex',
        autofillSupportedNetworks: PARADEX_NETWORKS,
        withdrawalSupportedNetworks: PARADEX_NETWORKS,
        asSourceSupportedNetworks: PARADEX_NETWORKS,
        hideFromList: true,
        // Key presence isn't a session signal — any write to widget's
        // walletStore creates `ls-paradex-accounts`, even with no accounts.
        // Hydrate eagerly only when actual L1 → Paradex mappings exist.
        hasPersistedSession: () => {
            const persisted = readStorageJson('ls-paradex-accounts') as
                | { state?: { paradexAccounts?: Record<string, string> } }
                | undefined
            return Object.keys(persisted?.state?.paradexAccounts ?? {}).length > 0
        },
        loadProvider: async () => {
            const mod = await import('@layerswap/wallet-paradex')
            return mod.createParadexProvider()
        },
    })
}
