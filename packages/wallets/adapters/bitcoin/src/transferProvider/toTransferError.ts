import { ActionMessageType } from '@layerswap/widget-types'
import { errorMessage, userRejectedError, walletActionError } from '@layerswap/wallet-core/errors'

/**
 * Map a failed Bitcoin transfer to the error the widget renders and the host
 * is told about. `name` is UI copy; the classification travels as `reasonCode`
 * and is declared only for the wallet's own decline message.
 */
export function toTransferError(error: unknown): Error {
    const message = errorMessage(error)

    if (message.includes('User rejected the request.')) {
        return userRejectedError({ message, cause: error })
    }
    if (message.includes('Insufficient balance.') || message.includes('Insufficient funds')) {
        return walletActionError(ActionMessageType.InsufficientFunds, { message, cause: error })
    }
    return walletActionError(ActionMessageType.UnexpectedErrorMessage, { message, cause: error })
}
