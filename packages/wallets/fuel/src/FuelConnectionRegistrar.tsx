'use client'
import { FC, useMemo } from 'react'
import {
    useRegisterWalletConnectionProvider,
    useSettingsState,
    type RegisteredWalletProvider,
    type LazyConnectionRegistrarProps,
} from '@layerswap/widget/internal'
import useFuelConnection from './useFuelConnection'
import { useFuelTransfer } from './transferProvider/useFuelTransfer'

// Lazy chunk for Fuel. The static surface of @layerswap/wallet-fuel
// references this module only via `import()` (see createFuelShell in
// ./index.tsx), so @fuels/react, @fuel-ts/account, and @fuel-ts/address
// stay out of the initial bundle of any app that statically imports the
// shell.
const FuelConnectionRegistrar: FC<LazyConnectionRegistrarProps> = ({ staticDefinition }) => {
    const { networks } = useSettingsState()
    const connection = useFuelConnection({ networks })
    const transferProvider = useFuelTransfer()

    const registered = useMemo<RegisteredWalletProvider>(
        () => ({
            id: staticDefinition.id,
            order: staticDefinition.order,
            connection,
            transferProviders: [transferProvider],
            balanceProviders: staticDefinition.balanceProviders,
            gasProviders: staticDefinition.gasProviders,
            addressUtilsProviders: staticDefinition.addressUtilsProviders,
            nftProviders: staticDefinition.nftProviders,
            contractAddressProviders: [],
            rpcHealthCheckProviders: [],
        }),
        [staticDefinition, connection, transferProvider],
    )

    useRegisterWalletConnectionProvider(registered)
    return null
}

FuelConnectionRegistrar.displayName = 'FuelConnectionRegistrar'

export default FuelConnectionRegistrar
