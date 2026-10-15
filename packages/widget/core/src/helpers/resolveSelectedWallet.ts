import type { Wallet } from '@layerswap/widget-types'

type SelectedAccount = { id: string; address: string; providerName?: string }

/** Resolve the exact account picked in the UI, including multi-account connectors. */
export function resolveSelectedWallet(wallets: readonly Wallet[], selected: SelectedAccount | undefined): Wallet | undefined {
    if (!selected) return undefined
    const matches = wallets.filter(wallet => wallet.id === selected.id
        && (!selected.providerName || wallet.providerName === selected.providerName)
        && [wallet.address, ...(wallet.addresses ?? [])].some(address => typeof address === 'string' && address.toLowerCase() === selected.address.toLowerCase()))
    if (matches.length !== 1) return undefined
    const wallet = matches[0]!
    return wallet.address === selected.address ? wallet : { ...wallet, address: selected.address }
}
