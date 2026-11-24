import { walletKey } from "@/lib/walletKey"
import type { InternalConnector } from "@layerswap/widget-types"
import type { WalletModalConnector } from "@/types/provider"
import type { RequestAdditionalConnectorsParams } from "@/types/wallet"
import { isWalletConnectRegistryConnector } from "./connectorSource"
import { createRegistryConnector } from "./createRegistryConnector"
import type { WalletConnectWalletBase } from "./types"

type RegistrySearch = (params: { query?: string; page?: number; pageSize?: number }) =>
    Promise<{ connectors: WalletConnectWalletBase[] }>

export type WalletConnectServiceDeps = {
    setSelectedConnector?: (connector: WalletModalConnector) => void
    getSelectedConnector?: () => WalletModalConnector | undefined
    addRecentConnector?: (connector: InternalConnector) => void
    requestRegistryConnectors?: (params?: RequestAdditionalConnectorsParams) => Promise<{
        connectors: WalletConnectWalletBase[]
        nextPage: number | null
        totalCount: number
    }>
    registryConnectors?: readonly WalletConnectWalletBase[]
    recentConnectors?: readonly InternalConnector[]
    isMobilePlatform?: boolean
}

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

export async function resolveWalletConnectConnection(
    connector: WalletModalConnector,
    providerName: string,
    deps: WalletConnectServiceDeps,
    { canResolveRegistry, selectWalletConnect }: {
        canResolveRegistry?: boolean
        selectWalletConnect: (registryMatched: boolean, phoneRequested: boolean) => boolean
    },
) {
    const isMobilePlatform = deps.isMobilePlatform ?? false
    let registryConnector = isWalletConnectRegistryConnector(connector) ? connector : undefined
    if (!registryConnector && isMobilePlatform && canResolveRegistry && deps.requestRegistryConnectors) {
        const registryWallet = await findRegistryWalletByName(deps.requestRegistryConnectors, connector.name)
        if (registryWallet) {
            registryConnector = createRegistryConnector(registryWallet, isMobilePlatform, providerName)
        }
    }
    const phoneRequested = !!(connector.hasBrowserExtension && (connector.showQrCode || (isMobilePlatform && connector.extensionNotFound)))
    const useWalletConnect = selectWalletConnect(!!registryConnector, phoneRequested)
    registryConnector = useWalletConnect ? registryConnector : undefined
    const mobile = registryConnector?.mobile ?? connector.mobile
    const deepLink = registryConnector ? (mobile?.native || mobile?.universal || undefined) : undefined
    return { useWalletConnect, registryConnector, mobile, deepLink }
}
