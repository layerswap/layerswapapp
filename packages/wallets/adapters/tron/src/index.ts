import { AppSettings } from '@layerswap/utils';
import type { WalletConnectionStore, WalletConnectionProviderProps } from "@layerswap/wallet-core/types"
import type { WalletProvider, WalletInitContext, BaseWalletProviderConfig } from "@layerswap/wallet-core/types"
import { LazyBalanceProvider, NetworkType, type LayerswapNetwork } from "@layerswap/widget-types";
import { TronGasProvider } from "./tronGasProvider"
import { createTronTransfer } from "./transferProvider/createTronTransfer"
import { createTronConnection } from "./service/createTronConnection"
import { retryInitOnModalOpen } from "@layerswap/wallet-core/chunkLoadRecovery"
import { initTronProvider } from "./init"
import { id } from "./constants"

export type TronProviderConfig<Network extends LayerswapNetwork = LayerswapNetwork> = BaseWalletProviderConfig<Network>

// The literal id in the return type lets `defineWalletDescriptor` in
// `@layerswap/wallets` verify it matches the descriptor id at compile time.
export function createTronProvider<Network extends LayerswapNetwork = LayerswapNetwork>(
    config: TronProviderConfig<Network> = {},
): WalletProvider<Network> & { id: typeof id } {
    const {
        customConnection,
        balanceProviders,
        gasProviders,
        transferProviders,
    } = config

    const init = (_ctx: WalletInitContext) => {
        initTronProvider()
        return retryInitOnModalOpen(initTronProvider)
    }

    const createConnection = (props: WalletConnectionProviderProps<Network>): WalletConnectionStore<Network> => {
        initTronProvider()
        if (customConnection) {
            return customConnection(props)
        }
        return createTronConnection(props)
    }

    const defaultBalanceProviders = [
        new LazyBalanceProvider(
            (n) => (n.type === NetworkType.Tron && !AppSettings.isTestnet()),
            () => import("./tronBalanceProvider").then(m => new m.TronBalanceProvider())
        )
    ]
    const finalBalanceProviders = balanceProviders !== undefined
        ? (Array.isArray(balanceProviders) ? balanceProviders : [balanceProviders])
        : defaultBalanceProviders

    const defaultGasProviders = [new TronGasProvider()]
    const finalGasProviders = gasProviders !== undefined
        ? (Array.isArray(gasProviders) ? gasProviders : [gasProviders])
        : defaultGasProviders

    const defaultTransferProviders = [createTronTransfer]
    const finalTransferProviders = transferProviders !== undefined
        ? (Array.isArray(transferProviders) ? transferProviders : [transferProviders])
        : defaultTransferProviders

    return {
        id,
        init,
        createConnection,
        gasProvider: finalGasProviders,
        balanceProvider: finalBalanceProviders,
        transferProvider: finalTransferProviders,
    }
}

export { createTronConnection } from "./service/createTronConnection"
export { useTronStore } from "./service/tronStore"
export { tronAdapterManager } from "./service/tronAdapterManager"
