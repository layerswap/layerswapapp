import type {
    WalletProvider,
    WalletConnectionStore,
    WalletInitContext,
    WalletConnectionProviderProps,
    BaseWalletProviderConfig,
    NftProvider,
} from "@layerswap/widget/types"
import { LazyGasProvider } from "@layerswap/widget/types"
import { KnownInternalNames } from "@layerswap/widget/internal"
import { StarknetBalanceProvider } from "./starknetBalanceProvider"
import { StarknetNftProvider } from "./starknetNftProvider"
import { createStarknetTransfer } from "./transferProvider/createStarknetTransfer"
import { createStarknetConnection } from "./service/createStarknetConnection"
import { initStarknetProvider } from "./init"
import { id } from "./constants"

const isStarknetNetwork = (name: string) =>
    KnownInternalNames.Networks.StarkNetMainnet.includes(name) ||
    KnownInternalNames.Networks.StarkNetGoerli.includes(name) ||
    KnownInternalNames.Networks.StarkNetSepolia.includes(name)

export type StarknetProviderConfig = BaseWalletProviderConfig & {
    nftProviders?: NftProvider | NftProvider[]
}

// The literal id in the return type lets `defineWalletDescriptor` in
// `@layerswap/wallets` verify it matches the descriptor id at compile time.
export function createStarknetProvider(config: StarknetProviderConfig = {}): WalletProvider & { id: typeof id } {
    const {
        customConnection,
        balanceProviders,
        gasProviders,
        nftProviders,
        transferProviders,
    } = config

    const init = (_ctx: WalletInitContext) => {
        initStarknetProvider()
        // No-op disposer; init is idempotent across remounts.
    }

    const createConnection = (props: WalletConnectionProviderProps): WalletConnectionStore => {
        initStarknetProvider()
        if (customConnection) {
            return customConnection(props)
        }
        return createStarknetConnection(props)
    }

    const defaultBalanceProviders = [new StarknetBalanceProvider()]
    const finalBalanceProviders = balanceProviders !== undefined
        ? (Array.isArray(balanceProviders) ? balanceProviders : [balanceProviders])
        : defaultBalanceProviders

    const defaultGasProviders = [
        new LazyGasProvider(
            (n) => isStarknetNetwork(n.name),
            () => import("./starknetGasProvider").then(m => new m.StarknetGasProvider())
        )
    ]
    const finalGasProviders = gasProviders !== undefined
        ? (Array.isArray(gasProviders) ? gasProviders : [gasProviders])
        : defaultGasProviders

    const defaultNftProviders = [new StarknetNftProvider()]
    const finalNftProviders = nftProviders !== undefined
        ? (Array.isArray(nftProviders) ? nftProviders : [nftProviders])
        : defaultNftProviders

    const defaultTransferProviders = [createStarknetTransfer]
    const finalTransferProviders = transferProviders !== undefined
        ? (Array.isArray(transferProviders) ? transferProviders : [transferProviders])
        : defaultTransferProviders

    return {
        id,
        init,
        createConnection,
        gasProvider: finalGasProviders,
        balanceProvider: finalBalanceProviders,
        nftProvider: finalNftProviders,
        transferProvider: finalTransferProviders,
    }
}

export { createStarknetConnection } from "./service/createStarknetConnection"
export { useStarknetStore } from "./service/starknetStore"
export { starknetConnectorManager } from "./service/starknetConnectorManager"
