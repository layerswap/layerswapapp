import { walletConnect as customWalletConnect } from "../connectors/resolveConnectors/walletConnect"
import { coinbaseWallet, metaMask, walletConnect } from "@wagmi/connectors";
import { isMobile } from "@layerswap/utils"
import { browserInjected } from "../connectors/browserInjected";
import type { CreateConnectorFn } from "wagmi";
import type { WalletConnectConfig } from "../types"

export const buildEVMConnectors = (
    HIDDEN_WALLETCONNECT_ID: string,
    walletConnectConfigs: WalletConnectConfig,
): readonly CreateConnectorFn[] => {
    const isMobilePlatform = isMobile()
    const walletConnectConnector = walletConnect({
        projectId: walletConnectConfigs.projectId,
        showQrModal: isMobilePlatform,
        customStoragePrefix: 'walletConnect',
    })
    const hiddenWalletConnectConnector = customWalletConnect({
        id: HIDDEN_WALLETCONNECT_ID,
        name: 'Hidden WalletConnect',
        rdns: '',
        type: 'other',
        mobile: { native: '', universal: '' },
        icon: '',
        projectId: walletConnectConfigs.projectId,
        showQrModal: false,
    })
    const metaMaskConnector = metaMask({
        dappMetadata: {
            name: walletConnectConfigs.name,
            url: walletConnectConfigs.url,
            iconUrl: walletConnectConfigs.icons[0],
        },
    })
    const coinbaseWalletConnector = coinbaseWallet({
        appName: walletConnectConfigs.name,
        appLogoUrl: walletConnectConfigs.icons[0],
    })
    const browserInjectedConnector = browserInjected()

    return [
        metaMaskConnector,
        coinbaseWalletConnector,
        walletConnectConnector,
        browserInjectedConnector,
        hiddenWalletConnectConnector,
    ] as const
}
