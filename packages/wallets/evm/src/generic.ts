import { NetworkType } from '@layerswap/widget-types';
import type { WalletConnectionStore, WalletConnectionProviderProps } from "@layerswap/ui-kit/types"
import type { WalletProvider, WalletInitContext } from "@layerswap/ui-kit/types"
import { LazyBalanceProvider, LazyGasProvider } from "@layerswap/utils";
import { createEvmConnection } from "./service/createEvmConnection"
import { initEvmProvider } from "./EVMProvider/init"
import { createEvmTransfer } from "./transferProvider/createEvmTransfer"
import { EVMContractAddressProvider } from "./evmContractAddressProvider"
import { EVMRpcHealthCheckProvider } from "./rpcHealthCheckProvider"
import type { EVMProviderConfig, WalletConnectConfig } from "./types"
import { getEvmConfig } from "./service/getEvmConfig"
import type { Network, NetworkWithTokens } from "@layerswap/utils"
import type { GaslessProvider } from "@layerswap/utils";
import { createEVMGaslessProvider } from "./gaslessProvider/createEVMGaslessProvider"
import { id } from "./constants"

export type { EVMProviderConfig, WalletConnectConfig }

export function createEVMProvider<TNetwork = NetworkWithTokens>(
    config: EVMProviderConfig<TNetwork> = {},
): WalletProvider<TNetwork> & { id: typeof id } {
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
        additionalSupportedNetworks,
        ethereumChainIds,
    } = config

    const moduleMultiStepHandlers = walletProviderModules
        ?.map(module => module.multiStepHandler)
        .filter(handler => handler !== undefined) || []

    const init = (_ctx: WalletInitContext) => {
    }

    const createConnection = (
        props: WalletConnectionProviderProps<TNetwork>,
    ): WalletConnectionStore<TNetwork> => {
        initEvmProvider({
            networks: props.networks,
            networkAdapter: props.networkAdapter,
            walletConnectConfigs,
            externalWagmiConfig: wagmiConfig ?? null,
        })
        if (customConnection) {
            return customConnection(props)
        }
        return createEvmConnection(props, {
            walletConnectProjectId: walletConnectConfigs?.projectId,
            extraMultiStepHandlers: moduleMultiStepHandlers,
            additionalSupportedNetworks,
            ethereumChainIds,
        })
    }

    const moduleBalanceProviders = walletProviderModules
        ?.map(module => module.balanceProvider)
        .filter(provider => provider !== undefined) || []

    const moduleGasProviders = walletProviderModules
        ?.map(module => module.gasProvider)
        .filter(provider => provider !== undefined) || []

    const defaultBalanceProviders = [
        new LazyBalanceProvider(
            network => network.type === NetworkType.EVM && !!network.token,
            () => import("./balanceProviders/evmBalanceProvider")
                .then(module => new module.EVMBalanceProvider()),
        ),
        ...moduleBalanceProviders,
    ]
    const finalBalanceProviders = balanceProviders !== undefined
        ? (Array.isArray(balanceProviders) ? balanceProviders : [balanceProviders])
        : defaultBalanceProviders

    const defaultGasProviders = [
        new LazyGasProvider(
            network => network.type === NetworkType.EVM && !!network.token,
            () => import("./gasProviders/evmGasProvider")
                .then(module => new module.EVMGasProvider()),
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

    const defaultTransferProviders = [createEvmTransfer]
    const finalTransferProviders = transferProviders !== undefined
        ? (Array.isArray(transferProviders) ? transferProviders : [transferProviders])
        : defaultTransferProviders

    const defaultGaslessProviders = [
        (): GaslessProvider => {
            const supportsNetwork = (network: Network) =>
                network.type === NetworkType.EVM && !!network.token
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
