import { ActionMessageType } from '@layerswap/widget-types'
import { errorMessage, isUserRejection, userRejectedError, walletActionError } from '@layerswap/wallet-core/errors'

/**
 * Map Paradex transfer errors using wallet cancellation codes, SDK errors or
 * explicit user-decline text. A 'reject' substring alone can describe a
 * sequencer or gateway failure rather than a cancelled wallet prompt.
 */
export function toTransferError(error: unknown): Error {
    const message = errorMessage(error)
    if (isUserRejection(error)) return userRejectedError({ message, cause: error })
    return walletActionError(ActionMessageType.UnexpectedErrorMessage, { message, cause: error })
}
