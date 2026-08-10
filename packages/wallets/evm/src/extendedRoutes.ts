import { NetworkType } from '@layerswap/widget-types';
import { LazyBalanceProvider, LazyGasProvider } from "@layerswap/utils";
import type { TransferProvider } from "@layerswap/utils";
import type { Network, NetworkWithTokens } from "@layerswap/utils"
import { KnownInternalNames } from "@layerswap/utils"
import { createEVMProvider as createBaseEVMProvider } from "./generic"
import { createHyperliquidTransfer } from "./additionalProviders/hyperliquid/createHyperliquidTransferProvider"
import { hyperliquidProvider } from "./additionalProviders/hyperliquid/hyperliquidExtendedRouteProvider"
import { HYPERLIQUID_ROUTES } from "./additionalProviders/hyperliquid/routes"
import { createPolymarketTransferProvider } from "./additionalProviders/polymarket/createPolymarketTransferProvider"
import { POLYMARKET_CONFIG } from "./additionalProviders/polymarket/constants"
import { polymarketProvider } from "./additionalProviders/polymarket/polymarketExtendedRouteProvider"
import { getEvmConfig } from "./service/getEvmConfig"
import type { EVMProviderConfig, WalletConnectConfig } from "./types"

const additionalSupportedNetworks = {
    asSource: [
        KnownInternalNames.Networks.LoopringGoerli,
        KnownInternalNames.Networks.LoopringMainnet,
        KnownInternalNames.Networks.LoopringSepolia,
    ],
    withdrawal: [
        ...Object.keys(HYPERLIQUID_ROUTES),
        ...Object.keys(POLYMARKET_CONFIG),
    ],
    autofill: [KnownInternalNames.Networks.BrineMainnet],
}

const asArray = <T,>(value: T | T[] | undefined): T[] =>
    value === undefined ? [] : Array.isArray(value) ? value : [value]

export function createEVMProvider<TNetwork = NetworkWithTokens>(
    config: EVMProviderConfig<TNetwork> = {},
) {
    const provider = createBaseEVMProvider({
        ...config,
        additionalSupportedNetworks:
            config.additionalSupportedNetworks ?? additionalSupportedNetworks,
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
                    network => network.name === KnownInternalNames.Networks.PolymarketMainnet,
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
                    network => network.type === NetworkType.Hyperliquid && !!network.token,
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
                    const supportsNetwork = (network: Network) =>
                        network.name === KnownInternalNames.Networks.PolymarketMainnet
                    return {
                        supportsNetwork,
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
