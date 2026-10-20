import { ActionMessageType } from '@layerswap/widget-types'
import { errorMessage, userRejectedError, walletActionError } from '@layerswap/wallet-core/errors'
import { StarknetAccountError } from '../service/starknetAccount'

/**
 * Map a failed Starknet `execute()` to the error the widget renders and the
 * host is told about. `name` is UI copy; the classification travels as
 * `reasonCode` and distinguishes authorization failures from wallet declines.
 */
export function toTransferError(error: unknown, context?: string): Error {
    const message = errorMessage(error)
    const cause = context ? new Error(context, { cause: error }) : error
    if (error instanceof StarknetAccountError) {
        return walletActionError(ActionMessageType.WaletMismatch, { message, cause, reasonCode: 'unauthorized' })
    }

    if (message === 'An error occurred (USER_REFUSED_OP)') {
        return userRejectedError({ message, cause })
    }
    if (error === 'failedTransfer') {
        return walletActionError(ActionMessageType.TransactionFailed, { message, cause })
    }
    // Generic execution failures carry no evidence that the user declined.
    return walletActionError(ActionMessageType.UnexpectedErrorMessage, { message, cause })
}
