import { useEffect, useRef } from 'react'
import { useConnect, useDisconnect } from '@starknet-react/core'
import { setStarknetAdapterApi } from './getStarknetAdapter'
import { useStarknetStore } from './starknetStore'
import { starknetConnectionService } from './StarknetConnectionService'

export function StarknetSync(): null {
    const { connectors } = useConnect()
    const { disconnectAsync } = useDisconnect()
    const connectorsRef = useRef(connectors)
    connectorsRef.current = connectors

    useEffect(() => {
        setStarknetAdapterApi({
            getConnectors: () => connectorsRef.current,
            disconnectAsync,
        })
        return () => setStarknetAdapterApi(null)
    }, [disconnectAsync])

    useEffect(() => {
        useStarknetStore.getState()._setConnectors(
            connectors.map(c => ({ id: c.id, name: c.name, icon: typeof c.icon === 'string' ? c.icon : (c.icon?.dark || '') })),
        )
    }, [connectors])

    useEffect(() => {
        starknetConnectionService.hydrateStoredWallets().catch(() => { /* swallow */ })
    }, [connectors])

    return null
}
