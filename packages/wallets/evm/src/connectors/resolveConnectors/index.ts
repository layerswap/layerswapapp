import { walletConnect } from "./walletConnect"
import walletsData from "../../jsons/walletsData.json"
import { InternalConnector } from "@layerswap/widget/types"
import { resolveEVMWalletConnectorIndex } from "../../evmUtils"

const wallets = Object.values(walletsData.listings)

export type WalletConnectWallet = {
    id: string;
    name: string;
    mobile: {
        native?: boolean;
        universal?: boolean;
    };
    desktop?: {
        native?: boolean;
        universal?: boolean;
    };
    rdns?: string;
    hasBrowserExtension?: boolean;
    extensionNotFound: boolean,
    type: string;
    icon: string;
    projectId: string;
    showQrModal: boolean;
    customStoragePrefix: string;
    shortName: string
} & InternalConnector

const walletsToFilter = [
    "5d9f1395b3a8e848684848dc4147cbd05c8d54bb737eac78fe103901fe6b01a1"
]

export const resolveWallets: (projectId: string) => WalletConnectWallet[] = (projectId: string) => {

    const resolvedWallets = pickLatestBy(
        wallets,
        c => c.slug
    ).filter(w => (w.mobile.native || w.mobile.universal) && w.name && w.slug && !walletsToFilter.some(wtf => wtf == w.id)).map(wallet => {
        const w = resolveWallet(wallet, projectId)
        return w
    })

    return resolvedWallets;
}


// Cache for connector instances to ensure stable references for wagmi reconnection
const connectorCache = new Map<string, ReturnType<typeof walletConnect>>()

export const resolveConnector = (name: string, projectId: string) => {
    // Return cached connector if available
    if (connectorCache.has(name)) {
        return connectorCache.get(name)!
    }

    const wallet = wallets.find(w => w.name === name && !walletsToFilter.includes(w.id))
    const params = resolveWallet(wallet, projectId)
    const connector = walletConnect(params as any)

    // Cache the connector for future use
    connectorCache.set(name, connector)
    return connector
}

const resolveWallet = (wallet: any, projectId: string) => {

    if (!wallet) {
        throw new Error(`Wallet ${wallet?.name} not found`)
    }

    const isMobileSupported = !!wallet.mobile.universal || !!wallet.mobile.native
    const isWalletConnectSupported = isMobileSupported || !!wallet.desktop?.universal || !!wallet.desktop?.native
    const type = isWalletConnectSupported ? "walletConnect" : "other"

    const w: WalletConnectWallet = {
        id: wallet.slug,
        shortName: wallet.metadata.shortName,
        name: wallet.name,
        mobile: wallet.mobile,
        rdns: wallet.rdns ? `${wallet.rdns}.wc` : undefined,
        icon: wallet.image_url.sm,
        projectId,
        showQrModal: false,
        customStoragePrefix: wallet.slug,
        order: resolveEVMWalletConnectorIndex(wallet.slug),
        type,
        isMobileSupported: isMobileSupported,
        hasBrowserExtension: wallet.injected != null,
        installUrl: wallet.injected != null ? wallet.app.browser ?? wallet.app.chrome : undefined,
        extensionNotFound: type == 'walletConnect'
    }

    return w
}

function pickLatestBy<T>(
    connectors: T[],
    keyFn: (c: T) => string
): T[] {
    const map = new Map<string, T>();
    for (const c of connectors) {
        const key = keyFn(c);
        const existing = map.get(key);
        if (!existing) {
            map.set(key, c);
        } else {
            const a = new Date((existing as any).updatedAt);
            const b = new Date((c as any).updatedAt);
            if (b > a) {
                map.set(key, c);
            }
        }
    }
    return Array.from(map.values());
}