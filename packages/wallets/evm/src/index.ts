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

export type { EVMProviderConfig, WalletConnectConfig }

export function createEVMProvider(config: EVMProviderConfig = {}): WalletProvider {
    const {
        walletConnectConfigs,
        walletProviderModules,
        customConnection,
        balanceProviders,
        gasProviders,
        transferProviders,
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

    const defaultTransferProviders = [createEvmTransfer, createHyperliquidTransfer]
    const finalTransferProviders = transferProviders !== undefined
        ? (Array.isArray(transferProviders) ? transferProviders : [transferProviders])
        : defaultTransferProviders

    const defaultRPCHealthCheckProviders = [new EVMRpcHealthCheckProvider()]
    const finalRPCHealthCheckProviders = rpcHealthCheckProviders !== undefined
        ? (Array.isArray(rpcHealthCheckProviders) ? rpcHealthCheckProviders : [rpcHealthCheckProviders])
        : defaultRPCHealthCheckProviders

    return {
        id: "evm",
        init,
        createConnection,
        gasProvider: finalGasProviders,
        balanceProvider: finalBalanceProviders,
        transferProvider: finalTransferProviders,
        contractAddressProvider: finalContractAddressProviders,
        rpcHealthCheckProvider: finalRPCHealthCheckProviders,
        extendedRouteProvider: [hyperliquidProvider]
    }
}

export { createEvmConnection } from "./service/createEvmConnection"
export { getEvmChainsConfig } from "./evmUtils/chainConfigs"
export {
    getEvmConfig,
    hasEvmConfig,
    isExternalEvmConfig,
    provideExternalEvmConfig,
} from "./service/getEvmConfig"
export { useEvmStore } from "./service/evmStore"
export { getEthersSigner, walletClientToSigner } from "./evmUtils/ethers"
