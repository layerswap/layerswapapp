import type { InternalConnector } from '@layerswap/widget-types'
import { name as PROVIDER_NAME } from '../constants'
import type { StellarWalletSnapshot } from './stellarStore'

// Wallets Kit reports both installed extensions and wallets that are usable
// without installation as `isAvailable`. Albedo/xBull open their own web flow,
// while BRIDGE_WALLET modules (currently WalletConnect) use a pairing transport.
// Neither kind should ever be presented as a missing browser extension.
const LOADABLE_WALLET_IDS = new Set(['albedo', 'xbull'])

export function toStellarConnector(wallet: StellarWalletSnapshot): InternalConnector {
    const isBridgeWallet = wallet.type === 'BRIDGE_WALLET'
    const isLoadable = isBridgeWallet || LOADABLE_WALLET_IDS.has(wallet.id)
    const isUnavailable = !isLoadable && !wallet.isAvailable && !wallet.isPlatformWrapper
    return {
        id: wallet.id,
        name: wallet.name,
        icon: wallet.icon,
        type: isBridgeWallet ? 'walletConnect' : isUnavailable ? 'other' : 'injected',
        installUrl: wallet.url,
        hasBrowserExtension: isBridgeWallet ? false : undefined,
        extensionNotFound: isUnavailable,
        isLoadable,
        isMobileSupported: isLoadable || wallet.isPlatformWrapper,
        providerName: PROVIDER_NAME,
    }
}
