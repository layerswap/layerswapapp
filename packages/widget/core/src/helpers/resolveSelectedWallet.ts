import type { Wallet } from '@layerswap/widget-types'
import { Address } from '@/lib/address/Address'

type SelectedAccount = { id: string; address: string; providerName?: string }

/** Use the account picker's chain-aware equality without guessing an ambiguous signer. */
export function resolveSelectedWallet(wallets: readonly Wallet[], selected: SelectedAccount | undefined): Wallet | undefined {
    if (!selected) return undefined
    const matches = wallets.filter(wallet => wallet.id === selected.id
        && (!selected.providerName || wallet.providerName === selected.providerName)
        && [wallet.address, ...(wallet.addresses ?? [])].some(address =>
            Address.equals(address, selected.address, null, wallet.providerName)))
    if (matches.length !== 1) return undefined
    const wallet = matches[0]!
    return wallet.address === selected.address ? wallet : { ...wallet, address: selected.address }
}
