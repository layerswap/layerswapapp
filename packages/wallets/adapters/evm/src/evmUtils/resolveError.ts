import { BaseError, InsufficientFundsError, EstimateGasExecutionError, UserRejectedRequestError } from 'viem'
import { isUserRejection } from '@layerswap/wallet-core/errors'

type ResolvedError = "insufficient_funds" | "transaction_rejected"

export const resolveError = (error: BaseError): ResolvedError | undefined => {
    const isInsufficientFundsError = typeof error?.walk === "function" && error?.walk((e: BaseError) => (e instanceof InsufficientFundsError)
        || (e instanceof EstimateGasExecutionError) || e?.['data']?.args?.some((a: string) => a?.includes("amount exceeds")) || error?.["cause"]?.["cause"]?.["cause"]?.["message"]?.includes("amount exceeds"))

    if (isInsufficientFundsError)
        return "insufficient_funds"

    const isUserRejectedRequestError = typeof error?.walk === "function" && error?.walk && error?.walk((e: BaseError) => e instanceof UserRejectedRequestError) instanceof UserRejectedRequestError

    if (isUserRejectedRequestError)
        return "transaction_rejected"

    const code_name = error?.['code']
        || error?.["name"]
    const inner_code = error?.['data']?.['code']
        || error?.['cause']?.['code']
        || error?.["cause"]?.["cause"]?.["cause"]?.["code"]

    // Decline evidence first: a nested -32000 is also what WalletConnect wallets
    // answer a declined prompt with, so it must not shadow the rejection.
    // A nested -1 is also viem's UnknownRpcError sentinel, not evidence that
    // the user declined. Require a rejection code, SDK name, or user-decline text.
    if (code_name === 4001 || isUserRejection(error))
        return "transaction_rejected"

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
