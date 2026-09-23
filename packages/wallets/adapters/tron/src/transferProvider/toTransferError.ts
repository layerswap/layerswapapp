import { ActionMessageType } from '@layerswap/widget-types'
import { userRejectedError, walletActionError } from '@layerswap/wallet-core/errors'

function errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message
    if (typeof error === 'string') return error
    const message = (error as { message?: unknown } | undefined)?.message
    return typeof message === 'string' ? message : String(error)
}

/**
 * Map a failed TRON transfer to the error the widget renders and the host is
 * told about. `name` is UI copy; the classification travels as `reasonCode`
 * and is declared only for the wallet's own decline message.
 */
export function toTransferError(error: unknown): Error {
    const message = errorMessage(error)

    if (message === "BANDWITH_ERROR") {
        return walletActionError(ActionMessageType.InsufficientFunds, { message, cause: error })
    }
    if (message === "user reject this request") {
        return userRejectedError({ message, cause: error })
    }
    return walletActionError(ActionMessageType.UnexpectedErrorMessage, { message, cause: error })
}
