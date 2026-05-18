'use client'
import { FC, useMemo } from 'react'
import {
    useRegisterWalletConnectionProvider,
    useSettingsState,
    type RegisteredWalletProvider,
    type LazyConnectionRegistrarProps,
} from '@layerswap/widget/internal'
import useStarknetConnection from './useStarknetConnection'
import { useStarknetTransfer } from './useStarknetTransfer'
import { StarknetNftProvider } from './starknetNftProvider'

// Lazy chunk for Starknet. The static surface of @layerswap/wallet-starknet
// references this module only via `import()` (see createStarknetShell in
// ./index.tsx), so @starknet-react/core and the eager `starknet` SDK
// imports inside starknetNftProvider stay out of the initial bundle of
// any app that statically imports the shell.
const StarknetConnectionRegistrar: FC<LazyConnectionRegistrarProps> = ({ staticDefinition }) => {
    const { networks } = useSettingsState()
    const connection = useStarknetConnection({ networks })
    const transferProvider = useStarknetTransfer()

    // StarknetNftProvider statically imports `starknet`'s Contract +
    // RpcProvider — heavy enough that constructing it here keeps the
    // starknet SDK in the lazy chunk rather than the static bundle.
    const nftProviders = useMemo(() => [new StarknetNftProvider()], [])

    const registered = useMemo<RegisteredWalletProvider>(
        () => ({
            id: staticDefinition.id,
            order: staticDefinition.order,
            connection,
            transferProviders: [transferProvider],
            balanceProviders: staticDefinition.balanceProviders,
            gasProviders: staticDefinition.gasProviders,
            addressUtilsProviders: staticDefinition.addressUtilsProviders,
            nftProviders,
            contractAddressProviders: [],
            rpcHealthCheckProviders: [],
        }),
        [staticDefinition, connection, transferProvider, nftProviders],
    )

    useRegisterWalletConnectionProvider(registered)
    return null
}

StarknetConnectionRegistrar.displayName = 'StarknetConnectionRegistrar'

export default StarknetConnectionRegistrar
