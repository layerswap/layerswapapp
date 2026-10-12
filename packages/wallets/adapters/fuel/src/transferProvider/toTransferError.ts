import { ActionMessageType } from '@layerswap/widget-types'
import { errorMessage, userRejectedError, walletActionError } from '@layerswap/wallet-core/errors'

/**
 * Map a failed Fuel transfer to the error the widget renders and the host is
 * told about. `name` is UI copy; the classification travels as `reasonCode`
 * and distinguishes account authorization failures from wallet declines.
 */
export function toTransferError(error: unknown): Error {
    const message = errorMessage(error)

    if (/^address is not authorized for this connection\.?$/i.test(message)) {
        return walletActionError(ActionMessageType.WaletMismatch, { message, cause: error, reasonCode: 'unauthorized' })
    }
    if (message === "The account(s) sending the transaction don't have enough funds to cover the transaction."
        || message === "the target cannot be met due to no coins available or exceeding the 255 coin limit."
    ) {
        return walletActionError(ActionMessageType.InsufficientFunds, { message, cause: error })
    }
    // A prompt closed without an answer counts as the user's action.
    if (message === "Request cancelled without user response!"
        || message === "User rejected the transaction!"
        || message === "User canceled sending transaction") {
        return userRejectedError({ message, cause: error })
    }
    return walletActionError(ActionMessageType.UnexpectedErrorMessage, { message, cause: error })
}
