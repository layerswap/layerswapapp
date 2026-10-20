import type { Wallet } from '@layerswap/widget-types'

type SelectedAccount = { id: string; address: string; providerName?: string }

/** Resolve the exact account picked in the UI, including multi-account connectors. */
export function resolveSelectedWallet(wallets: readonly Wallet[], selected: SelectedAccount | undefined): Wallet | undefined {
    if (!selected) return undefined
    const matches = wallets.filter(wallet => wallet.id === selected.id
        && (!selected.providerName || wallet.providerName === selected.providerName)
        && [wallet.address, ...(wallet.addresses ?? [])].some(address => typeof address === 'string' && sameAddress(address, selected.address)))
    if (matches.length !== 1) return undefined
    const wallet = matches[0]!
    return wallet.address === selected.address ? wallet : { ...wallet, address: selected.address }
}

// Hex addresses can differ in case or leading zeroes. Base58 and other
// case-sensitive account formats must retain their exact identity.
function sameAddress(left: string, right: string): boolean {
    if (/^0x[0-9a-f]+$/i.test(left) && /^0x[0-9a-f]+$/i.test(right)) return BigInt(left) === BigInt(right)
    return left === right
}
