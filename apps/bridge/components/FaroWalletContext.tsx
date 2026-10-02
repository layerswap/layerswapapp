import { useEffect } from 'react'
import { useWalletProvidersRegistry } from '@layerswap/wallet-core'
import { getWalletSessionAttributes } from '../lib/faro-wallet-context'
import { observeWalletContext } from '../lib/faro-session-context'
import { setWalletContext } from '../lib/faro'

/** Must be mounted beneath LayerswapProvider's wallet registry. Renders no UI. */
export default function FaroWalletContext() {
    const registry = useWalletProvidersRegistry()
    useEffect(() => observeWalletContext(
        registry,
        snapshots => setWalletContext(getWalletSessionAttributes(snapshots)),
        () => setWalletContext(getWalletSessionAttributes([])),
    ), [registry])
    return null
}
