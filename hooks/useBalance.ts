import { Currency } from "../Models/Currency"
import { Layer } from "../Models/Layer"
import useEVMBalance from "../lib/balances/evm/useEVMBalance"
import useLoopringBalance from "../lib/balances/loopring/useLoopringBalance"
import useOptimismBalance from "../lib/balances/optimism/useOptimismBalance"
import useStarknetBalance from "../lib/balances/starknet/useStarknetBalance"
import useZkSyncBalance from "../lib/balances/zksync/useZkSyncBalance"
import { Wallet } from "../stores/walletStore"

export type BalanceProvider = {
    getBalance: (layer: Layer, address: string) => Promise<Balance[] | undefined> | undefined | void,
    getGas: (layer: Layer, address: string, currency: Currency, userDestinationAddress: string, wallet?: Wallet) => Promise<Gas[] | undefined> | undefined | void,
    supportedNetworks: string[],
    name: string,
}

export type Balance = {
    network: string,
    amount: number,
    decimals: number,
    isNativeCurrency: boolean,
    token: string,
    request_time: string,
}

export type Gas = {
    token: string,
    gas: number,
    gasDetails?: {
        gasLimit?: number,
        maxFeePerGas?: number,
        gasPrice?: number,
        maxPriorityFeePerGas?: number
    },
    request_time: string
}

export default function useBalanceProvider() {

    const BalanceProviders: BalanceProvider[] = [
        useEVMBalance(),
        useOptimismBalance(),
        useStarknetBalance(),
        useZkSyncBalance(),
        useLoopringBalance()
    ]

    const getBalanceProvider = (network: Layer) => {
        const provider = BalanceProviders.find(provider => provider.supportedNetworks.includes(network.internal_name))
        return provider
    }

    return {
        getBalanceProvider
    }
}