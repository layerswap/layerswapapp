import { BaseError, UserRejectedRequestError } from 'viem'

// True when an error is the user rejecting a wallet request (signature or transaction).
export const isUserRejection = (err: unknown): boolean => {
    const e = err as BaseError
    if (typeof e?.walk === 'function' && e.walk(x => x instanceof UserRejectedRequestError) instanceof UserRejectedRequestError) return true
    if (err instanceof Error && /user rejected|user denied|rejected the request/i.test(err.message)) return true
    const code = (err as any)?.code ?? (err as any)?.cause?.code
    return code === 4001
}
