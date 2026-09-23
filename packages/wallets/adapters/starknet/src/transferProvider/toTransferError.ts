import { ActionMessageType } from '@layerswap/widget-types'
import { userRejectedError, walletActionError } from '@layerswap/wallet-core/errors'

/**
 * Map a failed Starknet `execute()` to the error the widget renders and the
 * host is told about. `name` is UI copy; the classification travels as
 * `reasonCode` and is only declared for a known wallet decline.
 */
export function toTransferError(error: unknown): Error {
    const message = error instanceof Error ? error.message : String(error)

    if (message === 'An error occurred (USER_REFUSED_OP)') {
        return userRejectedError({ message, cause: error })
    }
    if (message === 'Execute failed') {
        // Added as a rejection string by commit d2d98273a (2025-01-13, "include
        // additional rejection message"); its wallet-side origin is unverified.
        // The UI keeps the rejected copy, but no reasonCode is declared:
        // classification falls through to unknown_error so the host is told.
        // Promote to userRejectedError once telemetry `reason` confirms it is a decline.
        return walletActionError(ActionMessageType.TransactionRejected, { message, cause: error })
    }
    if (error === 'failedTransfer') {
        return walletActionError(ActionMessageType.TransactionFailed, { message, cause: error })
    }
    return walletActionError(ActionMessageType.UnexpectedErrorMessage, { message, cause: error })
}
