import { walletConnect } from "./walletConnect"
import walletsData from "@/public/walletsData.json"
import { InternalConnector } from "@/Models/WalletProvider"
import { resolveWalletConnectorIndex } from "../../utils/resolveWalletIcon"
import { featuredWalletsIds } from "@/context/evmConnectorsContext"

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '28168903b2d30c75e5f7f2d71902581b'
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
    type: string;
    icon: string;
    projectId: string;
    showQrModal: boolean;
    customStoragePrefix: string;
} & InternalConnector

export const resolveWallets: () => WalletConnectWallet[] = () => {

    const resolvedWallets = pickLatestBy(
        wallets,
        c => c.slug
    ).filter(w => w.mobile.native || w.mobile.universal && w.name && w.slug && featuredWalletsIds.some(fw => fw.includes(w.id.toLowerCase()))).map(wallet => {
        const w = resolveWallet(wallet)
        return w
    })

    return resolvedWallets;
}

export const resolveConnector = (name: string) => {
    const wallet = wallets.find(w => w.name === name)
    const params = resolveWallet(wallet)
    return walletConnect(params as any)
}

const resolveWallet = (wallet: any) => {

    if (!wallet) {
        throw new Error(`Wallet ${wallet.name} not found`)
    }

    const w: WalletConnectWallet = {
        id: wallet.slug,
        name: wallet.name,
        mobile: wallet.mobile,
        rdns: wallet.rdns ? `${wallet.rdns}.wc` : undefined,
        icon: wallet.image_url.sm,
        projectId,
        showQrModal: false,
        customStoragePrefix: wallet.slug,
        order: resolveWalletConnectorIndex(wallet.slug),
        type: "other",
        isMobileSupported: wallet.mobile.universal || wallet.mobile.native
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