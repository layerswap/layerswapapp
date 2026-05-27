import type {
    WalletProvider,
    WalletConnectionStore,
    WalletInitContext,
    WalletConnectionProviderProps,
    BaseWalletProviderConfig,
} from "@layerswap/widget/types"
import { FuelAddressUtilsProvider } from "./fuelAddressUtilsProvider"
import { FuelBalanceProvider } from "./fuelBalanceProvider"
import { FuelGasProvider } from "./fuelGasProvider"
import { createFuelTransfer } from "./transferProvider/createFuelTransfer"
import { createFuelConnection } from "./service/createFuelConnection"
import { initFuelProvider } from "./init"

export type FuelProviderConfig = BaseWalletProviderConfig

export function createFuelProvider(config: FuelProviderConfig = {}): WalletProvider {
    const {
        customConnection,
        balanceProviders,
        gasProviders,
        addressUtilsProviders,
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

    const defaultAddressUtilsProviders = [new FuelAddressUtilsProvider()]
    const finalAddressUtilsProviders = addressUtilsProviders !== undefined
        ? (Array.isArray(addressUtilsProviders) ? addressUtilsProviders : [addressUtilsProviders])
        : defaultAddressUtilsProviders

    const defaultTransferProviders = [createFuelTransfer]
    const finalTransferProviders = transferProviders !== undefined
        ? (Array.isArray(transferProviders) ? transferProviders : [transferProviders])
        : defaultTransferProviders

    return {
        id: "fuel",
        init,
        createConnection,
        addressUtilsProvider: finalAddressUtilsProviders,
        gasProvider: finalGasProviders,
        balanceProvider: finalBalanceProviders,
        transferProvider: finalTransferProviders,
    }
}

export { createFuelConnection } from "./service/createFuelConnection"
export { useFuelStore } from "./service/fuelStore"
export { getFuelInstance, hasFuelInstance } from "./service/getFuel"
