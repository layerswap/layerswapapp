import type {
    BaseWalletProviderConfig,
    WalletConnectionProviderProps,
    WalletConnectionStore,
    WalletInitContext,
    WalletProvider,
} from '@layerswap/wallet-core/types'
import {
    LazyBalanceProvider,
    LazyGasProvider,
    NetworkType,
    type NetworkWithTokens,
    type WalletConnectConfig,
} from '@layerswap/widget-types'
import { id } from './constants'
import { createStellarConnection } from './service/createStellarConnection'
import { stellarKitManager } from './service/stellarKitManager'
import { createStellarTransfer } from './transferProvider/createStellarTransfer'

export type StellarProviderConfig<Network = NetworkWithTokens> = BaseWalletProviderConfig<Network> & {
    walletConnect?: WalletConnectConfig
}

export function createStellarProvider<Network = NetworkWithTokens>(
    config: StellarProviderConfig<Network> = {},
): WalletProvider<Network> & { id: typeof id } {
    const {
        walletConnect,
        customConnection,
        balanceProviders,
        gasProviders,
        transferProviders,
    } = config

    const initialize = () => {
        void stellarKitManager.init(walletConnect).catch(error => {
            console.error('[Stellar] Failed to initialize wallet connectors', error)
        })
    }
    const init = (_context: WalletInitContext) => {
        initialize()
        return () => stellarKitManager.dispose()
    }
    const createConnection = (props: WalletConnectionProviderProps<Network>): WalletConnectionStore<Network> => {
        initialize()
        return customConnection ? customConnection(props) : createStellarConnection(props)
    }

    const defaultBalanceProviders = [
        new LazyBalanceProvider(
            network => network.type === NetworkType.Stellar,
            () => import('./stellarBalanceProvider').then(module => new module.StellarBalanceProvider()),
        ),
    ]
    const finalBalanceProviders = balanceProviders !== undefined
        ? (Array.isArray(balanceProviders) ? balanceProviders : [balanceProviders])
        : defaultBalanceProviders

    const defaultGasProviders = [
        new LazyGasProvider(
            network => network.type === NetworkType.Stellar,
            () => import('./stellarGasProvider').then(module => new module.StellarGasProvider()),
        ),
    ]
    const finalGasProviders = gasProviders !== undefined
        ? (Array.isArray(gasProviders) ? gasProviders : [gasProviders])
        : defaultGasProviders

    const finalTransferProviders = transferProviders !== undefined
        ? (Array.isArray(transferProviders) ? transferProviders : [transferProviders])
        : [createStellarTransfer]

    return {
        id,
        init,
        createConnection,
        balanceProvider: finalBalanceProviders,
        gasProvider: finalGasProviders,
        transferProvider: finalTransferProviders,
    }
}

export { createStellarConnection } from './service/createStellarConnection'
export { stellarStore } from './service/stellarStore'
export { stellarKitManager } from './service/stellarKitManager'
export { validateStellarXdr } from './transferProvider/validateStellarXdr'
