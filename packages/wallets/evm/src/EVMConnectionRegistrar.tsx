'use client'
import { FC, useMemo } from 'react'
import {
    useRegisterWalletConnectionProvider,
    useSettingsState,
    type RegisteredWalletProvider,
    type LazyConnectionRegistrarProps,
} from '@layerswap/widget/internal'
import useEVMConnection from './useEVMConnection'
import { useEVMTransfer } from './transferProvider/useEVMTransfer'
import { EVMContractAddressProvider } from './evmContractAddressProvider'
import { EVMRpcHealthCheckProvider } from './rpcHealthCheckProvider'

// Lazy chunk for EVM. The static surface of @layerswap/wallet-evm
// references this module only via `import()` (see createEVMShell in
// ./index.tsx), so wagmi/viem stay out of the initial bundle of any
// app that statically imports the shell. The connection hook, transfer
// hook, and the two heavy provider classes (contract-address + rpc-
// health, both of which touch wagmi or viem) all live here.
//
// This component is a sibling of the user's children inside the EVM
// wrapper, wrapped in <Suspense fallback={null}> by defineWalletProvider.
// While this chunk is loading, the rest of the widget renders normally;
// `wallets.length` stays empty until the registrar's effect fires.
const EVMConnectionRegistrar: FC<LazyConnectionRegistrarProps> = ({ staticDefinition }) => {
    const { networks } = useSettingsState()
    const connection = useEVMConnection({ networks })
    const transferProvider = useEVMTransfer()

    // The two heavy-import provider classes live here so their modules
    // join *this* chunk rather than the shell's static bundle. They have
    // no runtime config so a single instance per registrar mount is fine.
    const contractAddressProviders = useMemo(() => [new EVMContractAddressProvider()], [])
    const rpcHealthCheckProviders = useMemo(() => [new EVMRpcHealthCheckProvider()], [])

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
            contractAddressProviders,
            rpcHealthCheckProviders,
        }),
        [staticDefinition, connection, transferProvider, contractAddressProviders, rpcHealthCheckProviders],
    )

    useRegisterWalletConnectionProvider(registered)
    return null
}

EVMConnectionRegistrar.displayName = 'EVMConnectionRegistrar'

export default EVMConnectionRegistrar
