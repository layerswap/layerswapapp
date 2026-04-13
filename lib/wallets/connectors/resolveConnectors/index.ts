import { walletConnect } from "./walletConnect"
import walletsData from "@/public/walletsData.json"
import { WalletConnectWallet } from "@/Models/WalletConnectWallet"
import { evmWalletConnectWallets, WALLETS_TO_FILTER } from "../../walletConnect/registry"
import { decorateForWagmi } from "../../walletConnect/decorateForWagmi"

export type { WalletConnectWallet }

const rawWallets = Object.values(walletsData.listings)

export const walletConnectWallets: WalletConnectWallet[] = evmWalletConnectWallets.map(decorateForWagmi)

// Cache for connector instances to ensure stable references for wagmi reconnection
const connectorCache = new Map<string, ReturnType<typeof walletConnect>>()

export const resolveConnector = (name: string) => {
    if (connectorCache.has(name)) {
        return connectorCache.get(name)!
    }

    const base = evmWalletConnectWallets.find(w => w.name === name)
    if (!base) {
        // Fallback: look up by name in the raw registry (covers the pre-existing ad-hoc
        // lookup path for wallets that haven't been pre-resolved yet).
        const raw = rawWallets.find((w: any) => w.name === name && !WALLETS_TO_FILTER.includes(w.id))
        if (!raw) throw new Error(`Wallet ${name} not found`)
        const connector = walletConnect(decorateForWagmi({
            id: raw.slug,
            name: raw.name,
            icon: raw.image_url?.sm,
            rdns: raw.rdns || undefined,
            mobile: { native: raw.mobile?.native ?? null, universal: raw.mobile?.universal ?? null },
            desktop: raw.desktop ? { native: raw.desktop.native ?? null, universal: raw.desktop.universal ?? null } : undefined,
            chains: Array.isArray(raw.chains) ? raw.chains : [],
            hasBrowserExtension: raw.injected != null,
            installUrl: raw.injected != null ? (raw.app?.browser ?? raw.app?.chrome ?? undefined) : undefined,
            isMobileSupported: !!(raw.mobile?.native || raw.mobile?.universal),
            order: -1,
        }) as any)
        connectorCache.set(name, connector)
        return connector
    }

    const connector = walletConnect(decorateForWagmi(base) as any)
    connectorCache.set(name, connector)
    return connector
}
