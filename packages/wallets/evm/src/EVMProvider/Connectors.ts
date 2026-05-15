import { useEffect, useMemo, useState } from "react"
import { WalletConnectConfig } from ".."
import { walletConnect as customWalletConnect } from "../connectors/resolveConnectors/walletConnect"
import { isMobile } from "@layerswap/widget/internal";
import { browserInjected } from "../connectors/browserInjected";
import type { CreateConnectorFn } from "wagmi";

type WagmiConnectorFactories = {
    metaMask?: typeof import("@wagmi/connectors").metaMask
    coinbaseWallet?: typeof import("@wagmi/connectors").coinbaseWallet
    walletConnect?: typeof import("@wagmi/connectors").walletConnect
}

export const useEVMConnectors = (HIDDEN_WALLETCONNECT_ID: string, walletConnectConfigs: WalletConnectConfig): readonly CreateConnectorFn[] => {
    const [factories, setFactories] = useState<WagmiConnectorFactories>({})

    useEffect(() => {
        let cancelled = false
        import("@wagmi/connectors").then(mod => {
            if (cancelled) return
            setFactories({
                metaMask: mod.metaMask,
                coinbaseWallet: mod.coinbaseWallet,
                walletConnect: mod.walletConnect,
            })
        })
        return () => { cancelled = true }
    }, [])

    const browserInjectedConnector = useMemo(() => browserInjected(), [])
    const hiddenWalletConnectConnector = useMemo(() => customWalletConnect({
        id: HIDDEN_WALLETCONNECT_ID,
        name: 'Hidden WalletConnect',
        rdns: '',
        type: 'other',
        mobile: { native: '', universal: '' },
        icon: '',
        projectId: walletConnectConfigs.projectId,
        showQrModal: false,
    }), [HIDDEN_WALLETCONNECT_ID, walletConnectConfigs.projectId])

    return useMemo(() => {
        if (!factories.metaMask || !factories.coinbaseWallet || !factories.walletConnect) {
            return [browserInjectedConnector, hiddenWalletConnectConnector] as const
        }
        return [
            factories.metaMask({
                dappMetadata: {
                    name: walletConnectConfigs.name,
                    url: walletConnectConfigs.url,
                    iconUrl: walletConnectConfigs.icons[0],
                },
            }),
            factories.coinbaseWallet({
                appName: walletConnectConfigs.name,
                appLogoUrl: walletConnectConfigs.icons[0],
            }),
            factories.walletConnect({
                projectId: walletConnectConfigs.projectId,
                showQrModal: isMobile(),
                customStoragePrefix: 'walletConnect',
            }),
            browserInjectedConnector,
            hiddenWalletConnectConnector,
        ] as const
    }, [
        factories,
        walletConnectConfigs.name,
        walletConnectConfigs.url,
        walletConnectConfigs.icons,
        walletConnectConfigs.projectId,
        browserInjectedConnector,
        hiddenWalletConnectConnector,
    ])
}
