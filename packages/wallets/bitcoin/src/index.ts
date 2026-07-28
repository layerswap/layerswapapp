import type {
    WalletProvider,
    WalletConnectionStore,
    WalletInitContext,
    WalletConnectionProviderProps,
    BaseWalletProviderConfig,
} from "@layerswap/widget/types"
import { BitcoinGasProvider } from "./bitcoinGasProvider"
import { BitcoinBalanceProvider } from "./bitcoinBalanceProvider"
import { createBitcoinTransfer } from "./transferProvider/createBitcoinTransfer"
import { createBitcoinConnection } from "./service/createBitcoinConnection"
import { initBitcoinProvider } from "./init"
import { id } from "./constants"

export type BitcoinProviderConfig = BaseWalletProviderConfig

// The literal id in the return type lets `defineWalletDescriptor` in
// `@layerswap/wallets` verify it matches the descriptor id at compile time.
export function createBitcoinProvider(config: BitcoinProviderConfig = {}): WalletProvider & { id: typeof id } {
    const {
        customConnection,
        balanceProviders,
        gasProviders,
        transferProviders,
    } = config

    const init = (_ctx: WalletInitContext) => {
        // Bitcoin init needs the networks list to pick mainnet vs testnet; that
        // happens inside createConnection. This `init` is a no-op placeholder so
        // the provider has a defined lifecycle slot.
    }

    const createConnection = (props: WalletConnectionProviderProps): WalletConnectionStore => {
        initBitcoinProvider({ networks: props.networks })
        if (customConnection) {
            return customConnection(props)
        }
        return createBitcoinConnection(props)
    }

    const defaultBalanceProviders = [new BitcoinBalanceProvider()]
    const finalBalanceProviders = balanceProviders !== undefined
        ? (Array.isArray(balanceProviders) ? balanceProviders : [balanceProviders])
        : defaultBalanceProviders

    const defaultGasProviders = [new BitcoinGasProvider()]
    const finalGasProviders = gasProviders !== undefined
        ? (Array.isArray(gasProviders) ? gasProviders : [gasProviders])
        : defaultGasProviders

    const defaultTransferProviders = [createBitcoinTransfer]
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

export { createBitcoinConnection } from "./service/createBitcoinConnection"
export { useBitcoinStore } from "./service/bitcoinStore"
export { getBitcoinConfig, hasBitcoinConfig } from "./service/getBitcoinConfig"
