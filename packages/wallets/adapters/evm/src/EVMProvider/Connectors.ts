import { walletConnect as customWalletConnect } from "../connectors/resolveConnectors/walletConnect"
import { coinbaseWallet, metaMask, walletConnect } from "@wagmi/connectors";
import { isMobile } from "@layerswap/utils"
import { browserInjected } from "../connectors/browserInjected";
import type { CreateConnectorFn } from "wagmi";
import { HIDDEN_WALLETCONNECT_ID } from "../constants"
import type { WalletConnectConfig } from "../types"

/**
 * The package's custom WalletConnect connector used under the hood for
 * registry-wallet connects (per-wallet deep links / QR codes). Hosts that
 * supply an external `wagmiConfig` must include this connector to keep
 * registry wallets available — without it the widget hides the registry
 * lists and only offers the config's own connectors.
 */
export const createHiddenWalletConnectConnector = (
    { projectId }: Pick<WalletConnectConfig, 'projectId'>,
): CreateConnectorFn => customWalletConnect({
    id: HIDDEN_WALLETCONNECT_ID,
    name: 'Hidden WalletConnect',
    rdns: '',
    type: 'other',
    mobile: { native: '', universal: '' },
    icon: '',
    projectId,
    showQrModal: false,
})

export const buildEVMConnectors = (
    walletConnectConfigs: WalletConnectConfig,
): readonly CreateConnectorFn[] => {
    const isMobilePlatform = isMobile()
    const walletConnectConnector = walletConnect({
        projectId: walletConnectConfigs.projectId,
        showQrModal: isMobilePlatform,
        customStoragePrefix: 'walletConnect',
    })
    const hiddenWalletConnectConnector = createHiddenWalletConnectConnector(walletConnectConfigs)
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
