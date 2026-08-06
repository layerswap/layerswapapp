import { nameKey, resolveWalletIdentity } from "@/lib/wallets/identity"
import type { WalletConnectWalletBase } from "./types"

type RegistrySearch = (params: { query?: string; page?: number; pageSize?: number }) =>
    Promise<{ connectors: WalletConnectWalletBase[] }>

/**
 * Find one wallet's WalletConnect registry entry, which carries the mobile deeplink
 * that opens the wallet's app — an installed adapter has the wallet but can't tell
 * us its deeplink. Resolved on demand for just the wallet being connected, so we
 * never pre-fetch the whole registry to deeplink to a single wallet. Matching is
 * identity-exact: deeplinking into a lookalike product would be worse than
 * falling back to the QR flow.
 */
export async function findRegistryWalletByName(request: RegistrySearch, name: string,): Promise<WalletConnectWalletBase | undefined> {
    if (!nameKey(name)) return undefined
    const target = resolveWalletIdentity({ name })
    const { connectors } = await request({ query: name, pageSize: 10 })
    const match = connectors.find(reg =>
        resolveWalletIdentity({ rdns: reg.rdns, registryId: reg.id, name: reg.name }).id === target.id)
    if (!match?.mobile?.native && !match?.mobile?.universal) return undefined
    return match
}
