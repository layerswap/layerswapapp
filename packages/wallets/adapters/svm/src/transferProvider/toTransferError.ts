import { ActionMessageType } from '@layerswap/widget-types'
import { errorMessage, userRejectedError, walletActionError } from '@layerswap/wallet-core/errors'

/**
 * Map a failed Solana transfer to the error the widget renders and the host
 * is told about. `name` is UI copy; the classification travels as `reasonCode`
 * and is declared only for the wallet's own decline message. A pre-flight
 * balance check already labelled InsufficientFunds keeps that label.
 */
export function toTransferError(error: unknown): Error {
    const message = errorMessage(error)

    if (error instanceof Error && error.name === ActionMessageType.InsufficientFunds) {
        return walletActionError(ActionMessageType.InsufficientFunds, { message, cause: error })
    }
    if (message === "User rejected the request.") {
        return userRejectedError({ message, cause: error })
    }
    return walletActionError(ActionMessageType.UnexpectedErrorMessage, { message, cause: error })
}
