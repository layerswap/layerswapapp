import type { WalletProviderDescriptor } from "@layerswap/widget/types"
import { defineWalletDescriptor } from "./defineWalletDescriptor"
import { readStorageJson } from "./persistedSession"

// Inlined to keep this module tree-shake-safe. Paradex's runtime constants
// live in packages/wallets/paradex/src/service/ParadexConnectionService.ts —
// importing them would drag the chain SDK (which transitively pulls
// `starknet` + `@starkware-industries/starkware-crypto-utils`, ~884 KB
// parsed on `apps/bridge`). Keep these literals in sync with the
// `ParadexMainnet`/`ParadexTestnet` entries in widget's `knownIds.ts`.
const PARADEX_NETWORKS = ['PARADEX_MAINNET', 'PARADEX_TESTNET']

/**
 * Tree-shake-safe stand-in for `createParadexProvider`. Paradex is an
 * EVM + Starknet hybrid wallet whose static graph reaches `@paradex/sdk` →
 * `starknet` → `@starkware-industries/starkware-crypto-utils`. Deferring it
 * is what actually moves the starknet SDK out of the host's entry chunk.
 */
export function createParadexDescriptor(): WalletProviderDescriptor {
    return defineWalletDescriptor({
        id: 'paradex',
        name: 'Paradex',
        autofillSupportedNetworks: PARADEX_NETWORKS,
        withdrawalSupportedNetworks: PARADEX_NETWORKS,
        asSourceSupportedNetworks: PARADEX_NETWORKS,
        hideFromList: true,
        // Widget's persisted wallet store (`ls-paradex-accounts`, see
        // packages/widget/src/stores/walletStore.ts). The key exists for every
        // visitor once the store hydrates, so check the partialized payload
        // for actual L1 → Paradex account mappings instead of key presence.
        // Without this probe a refreshed page never hydrates the Paradex
        // provider, so its restored wallet stays invisible until the user
        // opens the connect modal.
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
