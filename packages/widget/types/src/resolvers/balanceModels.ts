import { type Wallet } from '../wallet';
import { LayerswapNetwork, LayerswapToken } from "../types"
import { NodeErrorCategory } from "./nodeErrorClassifier"

export type GasProps = {
    network: LayerswapNetwork,
    token: LayerswapToken,
    address?: string,
    recipientAddress?: string,
    /** Exact deposit action calldata, including an empty string for a plain transfer. */
    callData?: string,
    amountInBaseUnits?: string,
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
