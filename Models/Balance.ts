import { Network, Token } from "./Network"
import { Wallet } from "./WalletProvider"

export type BalanceProps = {
    networkName: string,
    token: Token,
    address: string
}

export type NetworkBalancesProps = {
    networkName: string,
    address: string
}

export type GasProps = {
    network: Network,
    token: Token,
    address?: `0x${string}`,
    recipientAddress?: string,
    wallet?: Wallet
}

export type TokenBalance = {
    network: string,
    amount: number,
    decimals: number,
    isNativeCurrency: boolean,
    token: string,
    request_time: string,
}

export type BalanceFetchError = {
  network: string
  token: string | null
  message: string
  code?: string | number
  cause?: unknown
}

export type BalanceResult = {
  balances: TokenBalance[] | null | undefined
  errors: BalanceFetchError[] | null | undefined
}

export type NetworkBalance = {
  balances?: TokenBalance[] | null,
  totalInUSD?: number,
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
    getBalance: ({ networkName, token, address }: BalanceProps) => Promise<TokenBalance | undefined | null> | TokenBalance | undefined,
    getNetworkBalances: (props: NetworkBalancesProps) => Promise<TokenBalance[] | undefined> | TokenBalance[] | undefined | void,
    getGas?: (props: GasProps) => Promise<Gas[] | undefined> | undefined | void,
    supportedNetworks: string[],
}