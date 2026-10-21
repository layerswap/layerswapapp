import { ActionMessageType } from '@layerswap/widget-types'
import { errorMessage, normalizeWalletErrorCode, userRejectedError, walletActionError } from '@layerswap/wallet-core/errors'

/**
 * Map a failed EVM transfer to the error the widget renders and the host is
 * told about. `name` is UI copy; the classification travels as `reasonCode`
 * (declared here for declines, inferred from `cause` otherwise). Preserve the
 * original cause so RPC failures retain their diagnostics and classification.
 */
export function toTransferError(error: unknown): Error {
    const message = errorMessage(error)
    const resolved = normalizeWalletErrorCode(error)
    if (resolved === 'user_rejected') return userRejectedError({ message, cause: error })
    if (resolved === 'insufficient_funds') return walletActionError(ActionMessageType.InsufficientFunds, { message, cause: error })
    return walletActionError(ActionMessageType.UnexpectedErrorMessage, { message, cause: error })
}
