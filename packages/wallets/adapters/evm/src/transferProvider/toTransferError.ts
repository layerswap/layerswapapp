import { ActionMessageType } from '@layerswap/widget-types'
import { userRejectedError, walletActionError } from '@layerswap/wallet-core/errors'
import type { BaseError } from 'viem'
import { resolveError } from '../evmUtils/resolveError'

function errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message
    if (typeof error === 'string') return error
    const message = (error as { message?: unknown } | undefined)?.message
    return typeof message === 'string' ? message : String(error)
}

/**
 * Map a failed EVM transfer to the error the widget renders and the host is
 * told about. `name` is UI copy; the classification travels as `reasonCode`
 * (declared here for declines, inferred from `cause` otherwise). Legacy nested
 * `-1` / `data.code` cancellations are only known to `resolveError`, so the
 * decline must be declared explicitly rather than left to the shared classifier.
 */
export function toTransferError(error: unknown): Error {
    const message = errorMessage(error)
    const resolved = resolveError(error as BaseError)
    if (resolved === 'transaction_rejected') return userRejectedError({ message, cause: error })
    if (resolved === 'insufficient_funds') return walletActionError(ActionMessageType.InsufficientFunds, { message, cause: error })
    return walletActionError(ActionMessageType.UnexpectedErrorMessage, { message, cause: error })
}
