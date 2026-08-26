import type { InternalConnector } from '@layerswap/widget-types'
import { name as PROVIDER_NAME } from '../constants'
import type { StellarWalletSnapshot } from './stellarStore'

// Wallets Kit reports both installed extensions and wallets that are usable
// without installation as `isAvailable`. These two modules open their own web
// connection flow, so they are loadable connectors rather than extensions.
// Product IDs are the stable identifiers exported by the Kit modules.
const LOADABLE_WALLET_IDS = new Set(['albedo', 'xbull'])

export function toStellarConnector(wallet: StellarWalletSnapshot): InternalConnector {
    const isUnavailable = !wallet.isAvailable && !wallet.isPlatformWrapper
    return {
        id: wallet.id,
        name: wallet.name,
        icon: wallet.icon,
        type: isUnavailable ? 'other' : 'injected',
        installUrl: wallet.url,
        extensionNotFound: isUnavailable,
        isLoadable: LOADABLE_WALLET_IDS.has(wallet.id),
        providerName: PROVIDER_NAME,
    }
}
