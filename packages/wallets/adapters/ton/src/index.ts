import { AppSettings } from '@layerswap/utils';
import type { WalletConnectionStore, WalletConnectionProviderProps } from "@layerswap/wallet-core/types"
import type { WalletProvider, WalletInitContext, BaseWalletProviderConfig } from "@layerswap/wallet-core/types"
import { LazyBalanceProvider, NetworkType, type LayerswapNetwork } from "@layerswap/widget-types";
import { TonGasProvider } from "./tonGasProvider"
import { createTonTransfer } from "./transferProvider/createTonTransfer"
import { createTonConnection } from "./service/createTonConnection"
import { initTonProvider } from "./init"
import { id } from "./constants"

export type TonClientConfig = {
    tonApiKey: string
    manifestUrl: string
}

export type TONProviderConfig<Network extends LayerswapNetwork = LayerswapNetwork> = BaseWalletProviderConfig<Network> & {
    tonConfigs?: TonClientConfig
}

// The literal id in the return type lets `defineWalletDescriptor` in
// `@layerswap/wallets` verify it matches the descriptor id at compile time.
export function createTONProvider<Network extends LayerswapNetwork = LayerswapNetwork>(
    config: TONProviderConfig<Network> = {},
): WalletProvider<Network> & { id: typeof id } {
    const {
        tonConfigs,
        customConnection,
        balanceProviders,
        gasProviders,
        transferProviders,
    } = config

    const init = (_ctx: WalletInitContext) => {
        initTonProvider({ tonConfigs })
        // No-op disposer; init is idempotent across remounts.
    }

    const createConnection = (props: WalletConnectionProviderProps<Network>): WalletConnectionStore<Network> => {
        initTonProvider({ tonConfigs })
        if (customConnection) {
            return customConnection(props)
        }
        return createTonConnection(props)
    }

    const defaultBalanceProviders = [
        new LazyBalanceProvider(
            (n) => (n.type === NetworkType.TON && !AppSettings.isTestnet()),
            () => import("./tonBalanceProvider").then(m => new m.TonBalanceProvider(tonConfigs?.tonApiKey))
        ),
    ]
    const finalBalanceProviders = balanceProviders !== undefined
        ? (Array.isArray(balanceProviders) ? balanceProviders : [balanceProviders])
        : defaultBalanceProviders

    const defaultGasProviders = [new TonGasProvider()]
    const finalGasProviders = gasProviders !== undefined
        ? (Array.isArray(gasProviders) ? gasProviders : [gasProviders])
        : defaultGasProviders

    const defaultTransferProviders = [createTonTransfer]
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

export { createTonConnection } from "./service/createTonConnection"
export { useTonStore } from "./service/tonStore"
export { getTonConnect, hasTonConnect } from "./service/getTonConnect"
