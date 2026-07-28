import { walletKey } from "@/lib/wallets/utils/walletKey"
import type { WalletConnectWalletBase } from "./types"

type RegistrySearch = (params: { query?: string; page?: number; pageSize?: number }) =>
    Promise<{ connectors: WalletConnectWalletBase[] }>

/**
 * Find one wallet's WalletConnect registry entry, which carries the mobile deeplink
 * that opens the wallet's app — an installed adapter has the wallet but can't tell
 * us its deeplink. Resolved on demand for just the wallet being connected, so we
 * never pre-fetch the whole registry to deeplink to a single wallet.
 */
export async function findRegistryWalletByName(request: RegistrySearch, name: string,): Promise<WalletConnectWalletBase | undefined> {
    const key = walletKey(name)
    if (!key) return undefined
    const { connectors } = await request({ query: name, pageSize: 10 })
    const match = connectors.find(reg => walletKey(reg.name) === key || walletKey(reg.id) === key)
    if (!match?.mobile?.native && !match?.mobile?.universal) return undefined
    return match
}
