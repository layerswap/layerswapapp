import { useEffect } from 'react'
import { useWalletProvidersRegistry } from '@layerswap/wallet-core'
import { getWalletSessionAttributes } from '../lib/faro-wallet-context'
import { setWalletContext } from '../lib/faro'

/** Must be mounted beneath LayerswapProvider's wallet registry. Renders no UI. */
export default function FaroWalletContext() {
    const registry = useWalletProvidersRegistry()
    useEffect(() => {
        // This dependency imports the SDK; the provider-free preview never mounts this effect.
        const { observeWalletContext } = require('../lib/faro-session-context') as typeof import('../lib/faro-session-context')
        return observeWalletContext(
        registry,
        snapshots => setWalletContext(getWalletSessionAttributes(snapshots)),
        () => setWalletContext(getWalletSessionAttributes([])),
        )
    }, [registry])
    return null
}
