import { BaseError } from 'viem'
import resolveError from '../WithdrawalProviders/EVMWalletWithdraw/resolveError'

// True when an error is the user rejecting a wallet request (signature or transaction).
export const isUserRejection = (err: unknown): boolean => {
    if (resolveError(err as BaseError) === 'transaction_rejected') return true
    if (err instanceof Error && /user rejected|user denied|rejected the request/i.test(err.message)) return true
    const code = (err as any)?.code ?? (err as any)?.cause?.code
    return code === 4001
}
