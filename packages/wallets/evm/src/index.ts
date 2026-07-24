import type {
    WalletProvider,
    WalletConnectionStore,
    WalletInitContext,
    WalletConnectionProviderProps,
} from "@layerswap/widget/types"
import { LazyBalanceProvider, LazyGasProvider, NetworkType } from "@layerswap/widget/types"
import { KnownInternalNames } from "@layerswap/widget/internal"
import { createEvmConnection } from "./service/createEvmConnection"
import { initEvmProvider } from "./EVMProvider/init"
import { createEvmTransfer } from "./transferProvider/createEvmTransfer"
import { EVMContractAddressProvider } from "./evmContractAddressProvider"
import { EVMRpcHealthCheckProvider } from "./rpcHealthCheckProvider"
import type { EVMProviderConfig, WalletConnectConfig } from "./types"
import { hyperliquidProvider } from "./additionalProviders/hyperliquid/hyperliquidExtendedRouteProvider"
import { createHyperliquidTransfer } from "./additionalProviders/hyperliquid/createHyperliquidTransferProvider"
import { getEvmConfig } from "./service/getEvmConfig"
import type { Network, TransferProvider, GaslessProvider } from "@layerswap/widget/types"
import { createPolymarketTransferProvider } from "./additionalProviders/polymarket/createPolymarketTransferProvider"
import { polymarketProvider } from "./additionalProviders/polymarket/polymarketExtendedRouteProvider"
import { createEVMGaslessProvider } from "./gaslessProvider/createEVMGaslessProvider"

import { id } from "./constants"

export type { EVMProviderConfig, WalletConnectConfig }

// The literal id in the return type lets `defineWalletDescriptor` in
// `@layerswap/wallets` verify it matches the descriptor id at compile time.
export function createEVMProvider(config: EVMProviderConfig = {}): WalletProvider & { id: typeof id } {
    const {
        walletConnectConfigs,
        walletProviderModules,
        customConnection,
        balanceProviders,
        gasProviders,
        transferProviders,
        gaslessProviders,
        contractAddressProviders,
        rpcHealthCheckProviders,
        wagmiConfig,
    } = config

    const moduleMultiStepHandlers = walletProviderModules
        ?.map(m => m.multiStepHandler)
        .filter(h => h !== undefined) || []

    const init = (_ctx: WalletInitContext) => {
        // No-op disposer for now; init is idempotent across remounts.
    }

    const createConnection = (props: WalletConnectionProviderProps): WalletConnectionStore => {
        initEvmProvider({
            networks: props.networks,
            walletConnectConfigs,
            externalWagmiConfig: wagmiConfig ?? null,
        })
        if (customConnection) {
            return customConnection(props)
        }
        return createEvmConnection(props, {
            walletConnectProjectId: walletConnectConfigs?.projectId,
            extraMultiStepHandlers: moduleMultiStepHandlers,
        })
    }

    const moduleBalanceProviders = walletProviderModules
        ?.map(m => m.balanceProvider)
        .filter(p => p !== undefined) || []

    const moduleGasProviders = walletProviderModules
        ?.map(m => m.gasProvider)
        .filter(p => p !== undefined) || []

    const defaultBalanceProviders = [
        new LazyBalanceProvider(
            (n) => n.type === NetworkType.EVM && !!n.token,
            () => import("./balanceProviders").then(m => new m.EVMBalanceProvider())
        ),
        new LazyBalanceProvider(
            (n) => n.name === KnownInternalNames.Networks.HyperliquidMainnet || n.name === KnownInternalNames.Networks.HyperliquidTestnet,
            () => import("./balanceProviders").then(m => new m.HyperliquidBalanceProvider())
        ),
        new LazyBalanceProvider(
            (n) => n.name === KnownInternalNames.Networks.PolymarketMainnet,
            () => import("./balanceProviders").then(m => new m.PolymarketBalanceProvider())
        ),
        ...moduleBalanceProviders,
    ]
    const finalBalanceProviders = balanceProviders !== undefined
        ? (Array.isArray(balanceProviders) ? balanceProviders : [balanceProviders])
        : defaultBalanceProviders

    const defaultGasProviders = [
        new LazyGasProvider(
            (n) => n.type === NetworkType.EVM && !!n.token,
            () => import("./gasProviders").then(m => new m.EVMGasProvider())
        ),
        new LazyGasProvider(
            (n) => n.type === NetworkType.Hyperliquid && !!n.token,
            () => import("./gasProviders").then(m => new m.HyperliquidGasProvider())
        ),
        ...moduleGasProviders,
    ]
    const finalGasProviders = gasProviders !== undefined
        ? (Array.isArray(gasProviders) ? gasProviders : [gasProviders])
        : defaultGasProviders

    const defaultContractAddressProviders = [new EVMContractAddressProvider()]
    const finalContractAddressProviders = contractAddressProviders !== undefined
        ? (Array.isArray(contractAddressProviders) ? contractAddressProviders : [contractAddressProviders])
        : defaultContractAddressProviders

    // These factories are invoked during render (ResolverProviders), before
    // createConnection → initEvmProvider has run, so getEvmConfig() must be
    // resolved at method-call time — never at factory time.
    const defaultTransferProviders = [
        createEvmTransfer,
        createHyperliquidTransfer,
        (): TransferProvider => {
            const supportsNetwork = (n: Network) => n.name === KnownInternalNames.Networks.PolymarketMainnet
            return {
                supportsNetwork,
                executeTransfer(params, wallet, onProgress) {
                    return createPolymarketTransferProvider(getEvmConfig(), supportsNetwork)
                        .executeTransfer(params, wallet, onProgress)
                },
            }
        },
    ]
    const finalTransferProviders = transferProviders !== undefined
        ? (Array.isArray(transferProviders) ? transferProviders : [transferProviders])
        : defaultTransferProviders

    const defaultGaslessProviders = [
        (): GaslessProvider => {
            const supportsNetwork = (n: Network) => n.type === NetworkType.EVM && !!n.token
            return {
                supportsNetwork,
                signGaslessDeposit(params) {
                    return createEVMGaslessProvider(getEvmConfig(), supportsNetwork)
                        .signGaslessDeposit(params)
                },
            }
        },
    ]
    const finalGaslessProviders = gaslessProviders !== undefined
        ? (Array.isArray(gaslessProviders) ? gaslessProviders : [gaslessProviders])
        : defaultGaslessProviders

    const defaultRPCHealthCheckProviders = [new EVMRpcHealthCheckProvider()]
    const finalRPCHealthCheckProviders = rpcHealthCheckProviders !== undefined
        ? (Array.isArray(rpcHealthCheckProviders) ? rpcHealthCheckProviders : [rpcHealthCheckProviders])
        : defaultRPCHealthCheckProviders

    return {
        id,
        init,
        createConnection,
        gasProvider: finalGasProviders,
        balanceProvider: finalBalanceProviders,
        transferProvider: finalTransferProviders,
        gaslessProvider: finalGaslessProviders,
        contractAddressProvider: finalContractAddressProviders,
        rpcHealthCheckProvider: finalRPCHealthCheckProviders,
        extendedRouteProvider: [hyperliquidProvider, polymarketProvider],
    }
}

export { createEvmConnection } from "./service/createEvmConnection"
export { createHiddenWalletConnectConnector } from "./EVMProvider/Connectors"
export { getEvmChainsConfig } from "./evmUtils/chainConfigs"
export {
    getEvmConfig,
    hasEvmConfig,
    isExternalEvmConfig,
    provideExternalEvmConfig,
} from "./service/getEvmConfig"
export { useEvmStore } from "./service/evmStore"
export { getEthersSigner, walletClientToSigner } from "./evmUtils/ethers"
export * from "./additionalProviders/polymarket/constants"
