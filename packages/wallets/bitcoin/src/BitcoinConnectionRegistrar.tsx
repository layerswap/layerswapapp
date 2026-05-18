'use client'
import { FC, useMemo } from 'react'
import {
    useRegisterWalletConnectionProvider,
    useSettingsState,
    type RegisteredWalletProvider,
    type LazyConnectionRegistrarProps,
} from '@layerswap/widget/internal'
import useBitcoinConnection from './useBitcoinConnection'
import { useBitcoinTransfer } from './transferProvider/useBitcoinTransfer'
import { BitcoinGasProvider } from './bitcoinGasProvider'

// Lazy chunk for Bitcoin. The static surface of @layerswap/wallet-bitcoin
// references this module only via `import()` (see createBitcoinShell in
// ./index.tsx), so @bigmi/react, @bigmi/client, bitcoinjs-lib, and the
// PSBT-building modules stay out of the initial bundle of any app that
// statically imports the shell.
const BitcoinConnectionRegistrar: FC<LazyConnectionRegistrarProps> = ({ staticDefinition }) => {
    const { networks } = useSettingsState()
    const connection = useBitcoinConnection({ networks })
    const transferProvider = useBitcoinTransfer()

    // BitcoinGasProvider transitively imports bitcoinjs-lib via buildPsbt —
    // constructing it here keeps that heavy SDK in the lazy chunk.
    const gasProviders = useMemo(() => [new BitcoinGasProvider()], [])

    const registered = useMemo<RegisteredWalletProvider>(
        () => ({
            id: staticDefinition.id,
            order: staticDefinition.order,
            connection,
            transferProviders: [transferProvider],
            balanceProviders: staticDefinition.balanceProviders,
            gasProviders,
            addressUtilsProviders: staticDefinition.addressUtilsProviders,
            nftProviders: staticDefinition.nftProviders,
            contractAddressProviders: [],
            rpcHealthCheckProviders: [],
        }),
        [staticDefinition, connection, transferProvider, gasProviders],
    )

    useRegisterWalletConnectionProvider(registered)
    return null
}

BitcoinConnectionRegistrar.displayName = 'BitcoinConnectionRegistrar'

export default BitcoinConnectionRegistrar
