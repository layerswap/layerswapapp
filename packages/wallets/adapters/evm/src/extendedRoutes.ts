import { LazyBalanceProvider, LazyGasProvider, NetworkType, type LayerswapNetwork } from "@layerswap/widget-types";
import type { TransferProvider } from "@layerswap/widget-types";
import { createEVMProvider as createBaseEVMProvider } from "./generic"
import { createHyperliquidTransfer } from "./additionalProviders/hyperliquid/createHyperliquidTransferProvider"
import { hyperliquidProvider } from "./additionalProviders/hyperliquid/hyperliquidExtendedRouteProvider"
import { createPolymarketTransferProvider } from "./additionalProviders/polymarket/createPolymarketTransferProvider"
import { polymarketProvider } from "./additionalProviders/polymarket/polymarketExtendedRouteProvider"
import { polymarketWithdrawal } from './additionalProviders/polymarket/withdrawal'
import { getEvmConfig } from "./service/getEvmConfig"
import type { EVMProviderConfig, WalletConnectConfig } from "./types"

const asArray = <T,>(value: T | T[] | undefined): T[] =>
    value === undefined ? [] : Array.isArray(value) ? value : [value]

export function createEVMProvider<TNetwork extends LayerswapNetwork = LayerswapNetwork>(
    config: EVMProviderConfig<TNetwork> = {},
) {
    const provider = createBaseEVMProvider({
        ...config,
    })

    const balanceProviders = asArray(provider.balanceProvider)
    const gasProviders = asArray(provider.gasProvider)
    const evmBalanceProvider = balanceProviders[0]!
    const evmGasProvider = gasProviders[0]!
    const moduleBalanceProviders = balanceProviders.slice(1)
    const moduleGasProviders = gasProviders.slice(1)

    return {
        ...provider,
        balanceProvider: config.balanceProviders !== undefined
            ? provider.balanceProvider
            : [
                evmBalanceProvider,
                new LazyBalanceProvider(
                    network => network.type === NetworkType.Hyperliquid,
                    () => import("./additionalProviders/hyperliquid/hyperliquidBalanceProvider")
                        .then(module => new module.HyperliquidBalanceProvider()),
                ),
                new LazyBalanceProvider(
                    network => network.type === NetworkType.Polymarket,
                    () => import("./additionalProviders/polymarket/polymarketBalanceProvider")
                        .then(module => new module.PolymarketBalanceProvider()),
                ),
                ...moduleBalanceProviders,
            ],
        gasProvider: config.gasProviders !== undefined
            ? provider.gasProvider
            : [
                evmGasProvider,
                new LazyGasProvider(
                    // Hyperliquid fees use the selected USDC token, not native token metadata.
                    network => network.type === NetworkType.Hyperliquid,
                    () => import("./additionalProviders/hyperliquid/hyperliquidGasProvider")
                        .then(module => new module.HyperliquidGasProvider()),
                ),
                ...moduleGasProviders,
            ],
        transferProvider: config.transferProviders !== undefined
            ? provider.transferProvider
            : [
                ...asArray(provider.transferProvider),
                createHyperliquidTransfer,
                (): TransferProvider => {
                    const supportsNetwork = (network: LayerswapNetwork) =>
                        network.type === NetworkType.Polymarket
                    return {
                        supportsNetwork,
                        withdrawal: polymarketWithdrawal,
                        executeTransfer(params, wallet, onProgress) {
                            return createPolymarketTransferProvider(getEvmConfig(), supportsNetwork)
                                .executeTransfer(params, wallet, onProgress)
                        },
                    }
                },
            ],
        extendedRouteProvider: [hyperliquidProvider, polymarketProvider],
    }
}

export type { EVMProviderConfig, WalletConnectConfig }
export * from "./additionalProviders/polymarket/constants"
