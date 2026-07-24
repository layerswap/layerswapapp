import type { WalletConnectionStore, WalletConnectionProviderProps } from "@layerswap/wallet-core/types"
import type { WalletProvider, WalletInitContext, BaseWalletProviderConfig } from "@layerswap/wallet-core/types"
import { FuelBalanceProvider } from "./fuelBalanceProvider"
import { FuelGasProvider } from "./fuelGasProvider"
import { createFuelTransfer } from "./transferProvider/createFuelTransfer"
import { createFuelConnection } from "./service/createFuelConnection"
import { initFuelProvider } from "./init"
import { id } from "./constants"

export type FuelProviderConfig = BaseWalletProviderConfig

// The literal id in the return type lets `defineWalletDescriptor` in
// `@layerswap/wallets` verify it matches the descriptor id at compile time.
export function createFuelProvider(config: FuelProviderConfig = {}): WalletProvider & { id: typeof id } {
    const {
        customConnection,
        balanceProviders,
        gasProviders,
        transferProviders,
    } = config

    const init = (_ctx: WalletInitContext) => {
        initFuelProvider()
        // No-op disposer; init is idempotent across remounts.
    }

    const createConnection = (props: WalletConnectionProviderProps): WalletConnectionStore => {
        initFuelProvider()
        if (customConnection) {
            return customConnection(props)
        }
        return createFuelConnection(props)
    }

    const defaultBalanceProviders = [new FuelBalanceProvider()]
    const finalBalanceProviders = balanceProviders !== undefined
        ? (Array.isArray(balanceProviders) ? balanceProviders : [balanceProviders])
        : defaultBalanceProviders

    const defaultGasProviders = [new FuelGasProvider()]
    const finalGasProviders = gasProviders !== undefined
        ? (Array.isArray(gasProviders) ? gasProviders : [gasProviders])
        : defaultGasProviders

    const defaultTransferProviders = [createFuelTransfer]
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

export { createFuelConnection } from "./service/createFuelConnection"
export { useFuelStore } from "./service/fuelStore"
export { getFuelInstance, hasFuelInstance } from "./service/getFuel"
