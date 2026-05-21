import { useEffect, useMemo } from 'react'
import { shallow } from 'zustand/shallow'
import { useConnectors, useFuel as useGlobalFuel } from '@fuels/react'
import { FuelConnectorEventTypes } from '@fuel-ts/account'
import type {
    WalletConnectionProvider,
    WalletConnectionProviderProps,
} from '@layerswap/widget/types'
import { useWalletStore } from '@layerswap/widget/internal'
import { useFuelTransfer } from '../transferProvider/useFuelTransfer'
import { name as PROVIDER_NAME } from '../constants'
import { fuelConnectionService } from './FuelConnectionService'
import { useFuelStore } from './fuelStore'

export function useFuelConnection({ networks }: WalletConnectionProviderProps): WalletConnectionProvider {
    fuelConnectionService.setNetworks(networks)

    const { connectors } = useConnectors()
    const { fuel } = useGlobalFuel()

    const addWallet = useWalletStore((state) => state.connectWallet)
    const removeWallet = useWalletStore((state) => state.disconnectWallet)
    const wallets = useWalletStore((state) => state.connectedWallets)

    fuelConnectionService.configure({ addWallet, removeWallet })

    useEffect(() => {
        useFuelStore.getState()._setConnectors(connectors)
    }, [connectors])

    useEffect(() => {
        useFuelStore.getState()._setFuel(fuel)
    }, [fuel])

    const { ready } = useFuelStore(s => ({ ready: s.ready }), shallow)

    const connectedConnectors = useMemo(() => connectors.filter(w => w.connected), [connectors])

    useEffect(() => {
        fuelConnectionService.resolveConnectedWallets()
    }, [connectedConnectors])

    useEffect(() => {
        const disposers = connectors.map((c) => {
            const handler = async () => {
                await fuelConnectionService.resolveConnectedWallets()
            }
            c.on(FuelConnectorEventTypes.currentNetwork, handler)
            return { connector: c, handler }
        })
        return () => {
            disposers.forEach(({ connector, handler }) => {
                connector.off(FuelConnectorEventTypes.currentNetwork, handler)
            })
        }
    }, [connectors])

    const connectedWallets = useMemo(
        () => wallets.filter(wallet => wallet.providerName === PROVIDER_NAME),
        [wallets],
    )

    const { executeTransfer: transfer } = useFuelTransfer()

    return useMemo<WalletConnectionProvider>(() => ({
        ...fuelConnectionService.buildProvider(connectedWallets),
        transfer,
    }), [connectedWallets, connectors, ready, transfer, networks])
}

export default useFuelConnection
