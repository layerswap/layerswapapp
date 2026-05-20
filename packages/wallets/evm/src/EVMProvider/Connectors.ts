import { useMemo } from "react"
import { WalletConnectConfig } from ".."
import { walletConnect as customWalletConnect } from "../connectors/resolveConnectors/walletConnect"
import { coinbaseWallet, metaMask, walletConnect } from "@wagmi/connectors";
import { isMobile } from "@layerswap/widget/internal";
import { browserInjected } from "../connectors/browserInjected";
import type { CreateConnectorFn } from "wagmi";

export const useEVMConnectors = (HIDDEN_WALLETCONNECT_ID: string, walletConnectConfigs: WalletConnectConfig): readonly CreateConnectorFn[] => {
    const walletConnectConnector = useMemo(() => walletConnect({ projectId: walletConnectConfigs.projectId, showQrModal: isMobile(), customStoragePrefix: 'walletConnect' }), [walletConnectConfigs.projectId])
    const hiddenWalletConnectConnector = useMemo(() => customWalletConnect({
        id: HIDDEN_WALLETCONNECT_ID,
        name: 'Hidden WalletConnect',
        rdns: '',
        type: 'other',
        mobile: { native: '', universal: '' },
        icon: '',
        projectId: walletConnectConfigs.projectId,
        showQrModal: false,
    }), [walletConnectConfigs.projectId])
    const metaMaskConnector = useMemo(() => metaMask({
        dappMetadata: {
            name: walletConnectConfigs.name,
            url: walletConnectConfigs.url ,
            iconUrl: walletConnectConfigs.icons[0],
        }
    }), [walletConnectConfigs.projectId, walletConnectConfigs.icons, walletConnectConfigs.name])
    const coinbaseWalletConnector = useMemo(() => coinbaseWallet({
        appName: walletConnectConfigs.name,
        appLogoUrl: walletConnectConfigs.icons[0],
    }), [walletConnectConfigs.name, walletConnectConfigs.icons[0]])
    const browserInjectedConnector = useMemo(() => browserInjected(), [])
    const defaultConnectors = [
        metaMaskConnector,
        coinbaseWalletConnector,
        walletConnectConnector,
        browserInjectedConnector,
        hiddenWalletConnectConnector,
    ] as const

    return defaultConnectors
}