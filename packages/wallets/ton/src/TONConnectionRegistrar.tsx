'use client'
import { FC, useMemo } from 'react'
import {
    useRegisterWalletConnectionProvider,
    useSettingsState,
    type RegisteredWalletProvider,
    type LazyConnectionRegistrarProps,
} from '@layerswap/widget/internal'
import useTONConnection from './useTONConnection'
import { useTONTransfer } from './transferProvider/useTONTransfer'
import { TonAddressUtilsProvider } from './tonAddressUtilsProvider'

// Lazy chunk for TON. The static surface of @layerswap/wallet-ton
// references this module only via `import()` (see createTONShell in
// ./index.tsx), so @tonconnect/ui-react and @ton/core (eagerly imported
// by TonAddressUtilsProvider) stay out of the initial bundle of any
// app that statically imports the shell.
const TONConnectionRegistrar: FC<LazyConnectionRegistrarProps> = ({ staticDefinition }) => {
    const { networks } = useSettingsState()
    const connection = useTONConnection({ networks })
    const transferProvider = useTONTransfer()

    // TonAddressUtilsProvider statically imports `@ton/core`'s Address —
    // constructing it here keeps the SDK in the lazy chunk rather than
    // the static bundle.
    const addressUtilsProviders = useMemo(() => [new TonAddressUtilsProvider()], [])

    const registered = useMemo<RegisteredWalletProvider>(
        () => ({
            id: staticDefinition.id,
            order: staticDefinition.order,
            connection,
            transferProviders: [transferProvider],
            balanceProviders: staticDefinition.balanceProviders,
            gasProviders: staticDefinition.gasProviders,
            addressUtilsProviders,
            nftProviders: staticDefinition.nftProviders,
            contractAddressProviders: [],
            rpcHealthCheckProviders: [],
        }),
        [staticDefinition, connection, transferProvider, addressUtilsProviders],
    )

    useRegisterWalletConnectionProvider(registered)
    return null
}

TONConnectionRegistrar.displayName = 'TONConnectionRegistrar'

export default TONConnectionRegistrar
