import { Currency } from "../Models/Currency"
import { Layer } from "../Models/Layer"
import useEVMBalance from "../lib/balances/evm/useEVMBalance"
import useOptimismBalance from "../lib/balances/evm/optimism/useOptimismBalance"
import useStarknetBalance from "../lib/balances/starknet/useStarknetBalance"
import useZkSyncBalance from "../lib/balances/zksync/useZkSyncBalance"
import { Wallet } from "../stores/walletStore"

export type BalanceProvider = {
    getBalance: ({ layer, address }: BalanceProps) => Promise<Balance[] | undefined> | undefined | void,
    getGas: ({ layer, address, currency, userDestinationAddress, wallet }: GasProps) => Promise<Gas[] | undefined> | undefined | void,
    supportedNetworks: string[],
    name: string,
}

export default function useBalanceProvider() {

    const BalanceProviders: BalanceProvider[] = [
        useEVMBalance(),
        useOptimismBalance(),
        useStarknetBalance(),
        useZkSyncBalance()
    ]

    const getBalanceProvider = (network: Layer) => {
        const provider = BalanceProviders.find(provider => provider.supportedNetworks.includes(network.internal_name))
        return provider
    }

    return {
        getBalanceProvider
    }
}

export type BalanceProps = {
    layer: Layer,
    address: string
}

export type GasProps = {
    layer: Layer,
    currency: Currency,
    address?: `0x${string}`,
    userDestinationAddress?: string,
    wallet?: Wallet
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