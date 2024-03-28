import { Wallet } from "../stores/walletStore"
import { CryptoNetwork, Token } from "./Network"

export type BalanceProps = {
    network: CryptoNetwork,
    address: string
}

export type GasProps = {
    network: CryptoNetwork,
    currency: Token,
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

export type BalanceProvider = {
    getBalance: ({ network, address }: BalanceProps) => Promise<Balance[] | undefined> | Balance[] | undefined | void,
    getGas?: ({ network, address, currency, userDestinationAddress, wallet }: GasProps) => Promise<Gas[] | undefined> | undefined | void,
    supportedNetworks: string[],
}