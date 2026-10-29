import type { LoginWallet, Wallet } from "@layerswap/widget-types"
import { Address } from "@layerswap/utils"
import type { WalletConnectionProvider } from "@/types/wallet"

export function isLoginWalletMatch(wallet: Pick<Wallet, "address" | "addresses" | "providerName">, providerId: string, loginWallet: LoginWallet | undefined): boolean {
    if (!loginWallet || providerId !== loginWallet.providerId) return false
    return [wallet.address, ...(wallet.addresses ?? [])]
        .some(address => Address.equals(address, loginWallet.address, null, wallet.providerName))
}

const markedSnapshotCache = new WeakMap<WalletConnectionProvider, { key: string, value: WalletConnectionProvider }>()

// Returns the same snapshot when nothing matches, and a cached copy otherwise so
// identity-keyed memos downstream stay stable.
export function markLoginWallet(snapshot: WalletConnectionProvider, loginWallet: LoginWallet | undefined): WalletConnectionProvider {
    if (!loginWallet) return snapshot
    const matches = (wallet: Wallet) => isLoginWalletMatch(wallet, snapshot.id, loginWallet)
    const activeMatches = !!snapshot.activeWallet && matches(snapshot.activeWallet)
    if (!activeMatches && !snapshot.connectedWallets?.some(matches)) return snapshot

    const key = `${loginWallet.providerId}|${loginWallet.address}`
    const cached = markedSnapshotCache.get(snapshot)
    if (cached?.key === key) return cached.value

    const value: WalletConnectionProvider = {
        ...snapshot,
        connectedWallets: snapshot.connectedWallets?.map(wallet => matches(wallet) ? { ...wallet, isLoginWallet: true } : wallet),
        activeWallet: activeMatches ? { ...snapshot.activeWallet!, isLoginWallet: true } : snapshot.activeWallet,
    }
    markedSnapshotCache.set(snapshot, { key, value })
    return value
}
