import { walletKey } from "@/lib/wallets/utils/walletKey"
import type { WalletConnectWalletBase } from "./types"

type RegistrySearch = (params: { query?: string; page?: number; pageSize?: number }) =>
    Promise<{ connectors: WalletConnectWalletBase[] }>

/**
 * Resolve a single wallet's WalletConnect registry entry (which holds the mobile
 * deeplink) by name, on demand.
 *
 * The `@solana/wallet-adapter` package exposes an installed adapter's name/icon
 * but not its WC deeplink. Rather than pre-fetching the registry for every
 * installed wallet up front, callers resolve the one wallet actually being
 * connected here — a single search request, already cached by the namespace's
 * `useAdditionalConnectors`, so repeats are free and long-tail wallets that fall
 * outside the first browse page still resolve.
 */
export async function findRegistryWalletByName(request: RegistrySearch, name: string,): Promise<WalletConnectWalletBase | undefined> {
    const key = walletKey(name)
    if (!key) return undefined
    const { connectors } = await request({ query: name, pageSize: 10 })
    return connectors.find(reg => walletKey(reg.name) === key || walletKey(reg.id) === key)
}
