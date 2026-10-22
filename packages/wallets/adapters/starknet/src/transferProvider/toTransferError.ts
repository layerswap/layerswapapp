import { ActionMessageType } from '@layerswap/widget-types'
import { errorMessage, userRejectedError, walletActionError } from '@layerswap/wallet-core/errors'

/**
 * Map a failed Starknet `execute()` to the error the widget renders and the
 * host is told about. `name` is UI copy; the classification travels as
 * `reasonCode` and is only declared for a known wallet decline.
 */
export function toTransferError(error: unknown): Error {
    const message = errorMessage(error)

    if (message === 'An error occurred (USER_REFUSED_OP)') {
        return userRejectedError({ message, cause: error })
    }
    if (error === 'failedTransfer') {
        return walletActionError(ActionMessageType.TransactionFailed, { message, cause: error })
    }
    // Generic execution failures carry no evidence that the user declined.
    return walletActionError(ActionMessageType.UnexpectedErrorMessage, { message, cause: error })
}
