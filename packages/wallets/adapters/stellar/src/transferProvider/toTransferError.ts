import { TransactionFailedError } from '@stellar/stellar-sdk'
import { ActionMessageType } from '@layerswap/widget-types'
import { errorMessage, isUserRejection, userRejectedError, walletActionError } from '@layerswap/wallet-core/errors'

const LABELS = new Set<string>(Object.values(ActionMessageType))

/**
 * Map signing-prompt errors, including wallets that report user rejection
 * only through message text. Use toTransferError for other stages, where
 * words like "closed" can indicate a connection failure instead.
 */
export function toSigningError(error: unknown): Error {
    if (error instanceof Error && LABELS.has(error.name)) return error
    const message = errorMessage(error)
    if (isUserRejection(error) || /reject|declin|cancel|denied|closed/i.test(message)) {
        return userRejectedError({ message: 'The Stellar transaction was rejected', cause: error })
    }
    return walletActionError(ActionMessageType.UnexpectedErrorMessage, { message: message || 'Stellar transaction failed', cause: error })
}

/**
 * Map any other transfer failure (account load, fee, simulation, validation,
 * submission). Errors that already carry an ActionMessageType label pass
 * through; Horizon result codes map to funds / failed; nothing here is a decline.
 */
export function toTransferError(error: unknown): Error {
    if (error instanceof Error && LABELS.has(error.name)) return error
    if (error instanceof TransactionFailedError) {
        const resultCodes = error.getResultCodes()
        if (
            resultCodes.transaction === 'tx_insufficient_balance'
            || resultCodes.operations.some(code => code === 'op_underfunded' || code === 'op_low_reserve')
        ) {
            return walletActionError(ActionMessageType.InsufficientFunds, { message: 'Insufficient Stellar balance or reserve', cause: error })
        }
        if (resultCodes.transaction === 'tx_bad_seq' || resultCodes.transaction === 'tx_too_late') {
            // This failure happened after the user signed. Never classify it as
            // a preflight expiry: the widget retries only unsigned stale actions.
            return walletActionError(ActionMessageType.TransactionFailed, { message: 'The signed Stellar transaction became stale', cause: error })
        }
        return walletActionError(ActionMessageType.TransactionFailed, { message: 'Horizon rejected the Stellar transaction', cause: error })
    }
    const message = errorMessage(error)
    return walletActionError(ActionMessageType.UnexpectedErrorMessage, {
        message: message || 'Stellar transaction failed',
        cause: error,
        // Outside signing, decline-like cause text must not override this failure.
        reasonCode: isUserRejection(error) ? 'unknown_error' : undefined,
    })
}
