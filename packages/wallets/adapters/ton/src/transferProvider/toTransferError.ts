import { ActionMessageType } from '@layerswap/widget-types'
import { userRejectedError, walletActionError } from '@layerswap/wallet-core/errors'

/**
 * Map a failed TON transfer to the error the widget renders and the host is
 * told about. TON Connect rejects with plain strings; `cause` keeps the
 * original value either way and `message` is always a string.
 */
export function toTransferError(error: unknown): Error {
    const message = error instanceof Error ? error.message : String(error)

    if (typeof error === 'string' && error.includes('Reject request')) {
        return userRejectedError({ message, cause: error })
    }
    if (typeof error === 'string' && error.includes('Transaction was not sent')) {
        return walletActionError(ActionMessageType.TransactionFailed, { message, cause: error })
    }
    return walletActionError(ActionMessageType.UnexpectedErrorMessage, { message, cause: error })
}
