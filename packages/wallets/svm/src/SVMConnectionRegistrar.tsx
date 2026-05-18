'use client'
import { FC, useMemo } from 'react'
import {
    useRegisterWalletConnectionProvider,
    useSettingsState,
    type RegisteredWalletProvider,
    type LazyConnectionRegistrarProps,
} from '@layerswap/widget/internal'
import useSVMConnection from './useSVMConnection'
import { useSVMTransfer } from './transferProvider/useSVMTransfer'
import { SolanaAddressUtilsProvider } from './svmAddressUtilsProvider'

// Lazy chunk for SVM (Solana). The static surface of @layerswap/wallet-svm
// references this module only via `import()` (see createSVMShell in
// ./index.tsx), so @solana/wallet-adapter-react and @solana/web3.js
// (eagerly imported by SolanaAddressUtilsProvider) stay out of the
// initial bundle of any app that statically imports the shell.
const SVMConnectionRegistrar: FC<LazyConnectionRegistrarProps> = ({ staticDefinition }) => {
    const { networks } = useSettingsState()
    const connection = useSVMConnection({ networks })
    const transferProvider = useSVMTransfer()

    // SolanaAddressUtilsProvider statically imports `@solana/web3.js`'s
    // PublicKey — heavy enough that constructing it here keeps the SDK
    // in the lazy chunk rather than the static bundle.
    const addressUtilsProviders = useMemo(() => [new SolanaAddressUtilsProvider()], [])

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

SVMConnectionRegistrar.displayName = 'SVMConnectionRegistrar'

export default SVMConnectionRegistrar
