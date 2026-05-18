'use client'
import { FC, useMemo } from 'react'
import {
    useRegisterWalletConnectionProvider,
    useSettingsState,
    type RegisteredWalletProvider,
    type LazyConnectionRegistrarProps,
} from '@layerswap/widget/internal'
import { useParadexConnection } from './useParadexConnection'

// Lazy chunk for Paradex. The static surface of @layerswap/wallet-paradex
// references this module only via `import()` (see createParadexShell in
// ./index.tsx), so wagmi, @wagmi/core, ethers, and the multi-step
// handler stay out of the initial bundle of any app that statically
// imports the shell.
//
// Note: Paradex has no transferProvider (withdrawal flows route through
// the multi-step handler). It also has no own connection-layer balance
// providers — those are wired via createParadexShell's static balance
// list (a LazyBalanceProvider that imports the paradex SDK on demand).
const ParadexConnectionRegistrar: FC<LazyConnectionRegistrarProps> = ({ staticDefinition }) => {
    const { networks } = useSettingsState()
    const connection = useParadexConnection({ networks })

    const registered = useMemo<RegisteredWalletProvider>(
        () => ({
            id: staticDefinition.id,
            order: staticDefinition.order,
            connection,
            transferProviders: [],
            balanceProviders: staticDefinition.balanceProviders,
            gasProviders: staticDefinition.gasProviders,
            addressUtilsProviders: staticDefinition.addressUtilsProviders,
            nftProviders: staticDefinition.nftProviders,
            contractAddressProviders: [],
            rpcHealthCheckProviders: [],
        }),
        [staticDefinition, connection],
    )

    useRegisterWalletConnectionProvider(registered)
    return null
}

ParadexConnectionRegistrar.displayName = 'ParadexConnectionRegistrar'

export default ParadexConnectionRegistrar
