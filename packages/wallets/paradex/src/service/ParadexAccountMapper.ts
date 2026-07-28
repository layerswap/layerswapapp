import type { WalletConnectionProvider } from '@layerswap/widget/types'
import { useWalletStore } from '@layerswap/widget/internal'
import { useParadexActiveStore, type ParadexAccount } from './paradexActiveStore'

export type ParadexAccountMap = { [l1Address: string]: string }

/**
 * Owns the persisted L1-address ↔ Paradex-address mapping and the selected
 * backing account. Pure account bookkeeping — no Paradex SDK access and no
 * knowledge of how peer providers are wired; callers pass in the provider
 * snapshots they already hold.
 */
export class ParadexAccountMapper {
    getAccounts(): ParadexAccountMap {
        return useWalletStore.getState().paradexAccounts ?? {}
    }

    addAccount(payload: { l1Address: string; paradexAddress: string }): void {
        useWalletStore.getState().addParadexAccount(payload)
    }

    removeAccount(l1Address: string): void {
        useWalletStore.getState().removeParadexAccount(l1Address)
    }

    getSelectedAccount(): ParadexAccount | undefined {
        return useParadexActiveStore.getState().selectedAccount
    }

    setSelectedAccount(account: ParadexAccount | undefined): void {
        useParadexActiveStore.getState().setSelectedAccount(account)
    }

    /**
     * The Paradex address mapped to an L1 account, or undefined when no valid
     * mapping exists. The mapping is persisted in localStorage; a
     * tampered/corrupted entry must never be used to derive the trading
     * account. Paradex addresses are Starknet field elements (0x + up to 64
     * hex chars) — reject anything else and drop the bad entry so it isn't
     * retried.
     */
    findParadexAddress(l1Account: string, accounts?: ParadexAccountMap): string | undefined {
        const map = accounts ?? this.getAccounts()
        const paradexAddress = map?.[l1Account?.toLowerCase()]
        if (!paradexAddress) return undefined
        const isValidParadexAddress = /^0x[0-9a-fA-F]{1,64}$/.test(paradexAddress)
        if (!isValidParadexAddress) {
            console.error(`[Paradex] Address integrity check failed for ${l1Account}; removing entry`)
            this.removeAccount(l1Account)
            return undefined
        }
        return paradexAddress
    }

    /**
     * Resolve which L1 account currently backs Paradex: the explicitly
     * selected account while its wallet is still connected, otherwise the
     * first connected EVM/Starknet wallet that has a stored Paradex mapping.
     */
    resolveActiveConnection(
        evmProvider: WalletConnectionProvider,
        starknetProvider: WalletConnectionProvider,
    ): ParadexAccount | undefined {
        const paradexAccounts = this.getAccounts()
        if (!paradexAccounts) return undefined
        const l1Addresses = Object.keys(paradexAccounts)
        const selected = this.getSelectedAccount()
        const selectedProvider = selected
            ? (selected.providerName === 'EVM' ? evmProvider : starknetProvider)
            : undefined
        const selectedAvailable = selected
            && selectedProvider?.connectedWallets?.some(w =>
                w.id === selected.id
                && w.addresses.some(wa => wa.toLowerCase() === selected.l1Address.toLowerCase()),
            )
        if (selectedAvailable) return selected

        const evmWallet = evmProvider.connectedWallets?.find(w =>
            w.addresses.some(wa => l1Addresses.some(pa => pa.toLowerCase() === wa.toLowerCase())),
        )
        const starknetWallet = starknetProvider.connectedWallets?.find(w =>
            w.addresses.some(wa => l1Addresses.some(pa => pa.toLowerCase() === wa.toLowerCase())),
        )
        const defaultWallet = evmWallet || starknetWallet
        if (!defaultWallet) return undefined
        return {
            id: defaultWallet.id,
            providerName: defaultWallet.providerName as 'Starknet' | 'EVM',
            l1Address: defaultWallet.addresses.find(wa =>
                l1Addresses.some(pa => pa.toLowerCase() === wa.toLowerCase()),
            )!,
        }
    }
}
