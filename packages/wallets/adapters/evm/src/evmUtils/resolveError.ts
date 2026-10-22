import { BaseError, InsufficientFundsError, EstimateGasExecutionError } from 'viem'
import { isUserRejection } from '@layerswap/wallet-core/errors'

type ResolvedError = "insufficient_funds" | "transaction_rejected"

export const resolveError = (error: BaseError): ResolvedError | undefined => {
    const isInsufficientFundsError = typeof error?.walk === "function" && error?.walk((e: BaseError) => (e instanceof InsufficientFundsError)
        || (e instanceof EstimateGasExecutionError) || e?.['data']?.args?.some((a: string) => a?.includes("amount exceeds")) || error?.["cause"]?.["cause"]?.["cause"]?.["message"]?.includes("amount exceeds"))

    if (isInsufficientFundsError)
        return "insufficient_funds"

    // viem wraps every CAIP-25 5000 in UserRejectedRequestError, including wallet
    // failures relayed that way; the shared classifier tells the two apart.
    // It runs before the -32000 check below: WalletConnect wallets also answer
    // a declined prompt with -32000.
    if (isUserRejection(error))
        return "transaction_rejected"

    const code_name = error?.['code']
        || error?.["name"]
    const inner_code = error?.['data']?.['code']
        || error?.['cause']?.['code']
        || error?.["cause"]?.["cause"]?.["cause"]?.["code"]

    if (code_name === 'INSUFFICIENT_FUNDS'
        || code_name === 'UNPREDICTABLE_GAS_LIMIT'
        || (code_name === -32603 && inner_code === 3)
        || inner_code === -32000
        || code_name === 'EstimateGasExecutionError'
        || code_name === 3)
        return "insufficient_funds"
}

/**
 * Share the rejection decision between EVM signing and transaction errors.
 */
export function isEvmUserRejection(error: unknown): boolean {
    return isUserRejection(error) || resolveError(error as BaseError) === 'transaction_rejected'
}
