import { BaseError } from 'viem'
import resolveError from '../WithdrawalProviders/EVMWalletWithdraw/resolveError'

/**
 * True when an error represents the user rejecting a wallet request — a signature
 * (eth_signTypedData_v4) or a transaction. Covers viem's classified rejection (via
 * resolveError), the common provider rejection messages, and the EIP-1193 user-rejected
 * code (4001). Shared by the EVM transfer/sign button and the Hyperliquid withdrawal flow.
 */
export const isUserRejection = (err: unknown): boolean => {
    if (resolveError(err as BaseError) === 'transaction_rejected') return true
    if (err instanceof Error && /user rejected|user denied|rejected the request/i.test(err.message)) return true
    const code = (err as any)?.code ?? (err as any)?.cause?.code
    return code === 4001
}
