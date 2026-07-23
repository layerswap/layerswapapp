import { Network, Token } from "./Network"
import { Wallet } from "@/types/wallet"
import { NodeErrorCategory } from "@/lib/balances/nodeErrorClassifier"

export type GasProps = {
    network: Network,
    token: Token,
    address?: string,
    recipientAddress?: string,
    wallet?: Wallet,
    amount?: number,
}

export type TokenBalanceError = {
    message: string;
    name?: string;
    stack?: string;
    code?: string;
    status?: number;
    statusText?: string;
    responseData?: unknown;
    requestUrl?: string;
    category?: NodeErrorCategory;
}

export type TokenBalance = {
    network: string,
    amount: number | undefined,
    decimals: number,
    isNativeCurrency: boolean,
    token: string,
    request_time: string,
    error?: TokenBalanceError
}

export type NetworkBalance = {
    balances?: TokenBalance[] | null,
}