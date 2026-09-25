import { UserRejectsError } from '@tonconnect/sdk'
import { ActionMessageType } from '@layerswap/widget-types'
import { errorMessage, userRejectedError, walletActionError } from '@layerswap/wallet-core/errors'

/**
 * TON Connect's `sendTransaction` rejects a declined prompt with
 * `UserRejectsError` (name stays 'Error', message
 * "[TON_CONNECT_SDK_ERROR] UserRejectsError: ..."). A duplicate SDK copy in
 * the bundle breaks `instanceof`, so the class name in name/message also counts.
 */
function isUserRejectsError(error: unknown): boolean {
    if (error instanceof UserRejectsError) return true
    if (!error || typeof error !== 'object') return false
    const { name, message } = error as { name?: unknown; message?: unknown }
    return [name, message].some(value => typeof value === 'string' && /UserRejectsError/.test(value))
}

/**
 * Map a failed TON transfer to the error the widget renders and the host is
 * told about. TON Connect rejects with `UserRejectsError` or plain strings;
 * `cause` keeps the original value either way and `message` is always a string.
 */
export function toTransferError(error: unknown): Error {
    const message = errorMessage(error)

    if (isUserRejectsError(error) || (typeof error === 'string' && error.includes('Reject request'))) {
        return userRejectedError({ message, cause: error })
    }
    if (typeof error === 'string' && error.includes('Transaction was not sent')) {
        return walletActionError(ActionMessageType.TransactionFailed, { message, cause: error })
    }
    return walletActionError(ActionMessageType.UnexpectedErrorMessage, { message, cause: error })
}
