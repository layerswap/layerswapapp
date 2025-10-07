import { Network, Token } from "./Network"
import { Wallet } from "./WalletProvider"

export type GasProps = {
    network: Network,
    token: Token,
    address?: `0x${string}`,
    recipientAddress?: string,
    wallet?: Wallet
}

export type TokenBalance = {
    network: string,
    amount: number | undefined,
    decimals: number,
    isNativeCurrency: boolean,
    token: string,
    request_time: string,
    error?: string
}

export type NetworkBalance = {
    balances?: TokenBalance[] | null,
    totalInUSD?: number,
}