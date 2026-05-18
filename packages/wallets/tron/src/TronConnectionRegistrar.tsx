'use client'
import { FC, useMemo } from 'react'
import {
    useRegisterWalletConnectionProvider,
    useSettingsState,
    type RegisteredWalletProvider,
    type LazyConnectionRegistrarProps,
} from '@layerswap/widget/internal'
import useTronConnection from './useTronConnection'
import { useTronTransfer } from './transferProvider/useTronTransfer'

// Lazy chunk for Tron. The static surface of @layerswap/wallet-tron
// references this module only via `import()` (see createTronShell in
// ./index.tsx), so @tronweb3/tronwallet-adapter-react-hooks and the
// tronweb SDK stay out of the initial bundle of any app that statically
// imports the shell.
const TronConnectionRegistrar: FC<LazyConnectionRegistrarProps> = ({ staticDefinition }) => {
    const { networks } = useSettingsState()
    const connection = useTronConnection({ networks })
    const transferProvider = useTronTransfer()

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

TronConnectionRegistrar.displayName = 'TronConnectionRegistrar'

export default TronConnectionRegistrar
