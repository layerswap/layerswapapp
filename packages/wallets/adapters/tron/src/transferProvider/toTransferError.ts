import { ActionMessageType } from '@layerswap/widget-types'
import { errorMessage, userRejectedError, walletActionError } from '@layerswap/wallet-core/errors'
import { TronBroadcastError } from './tronBroadcast.js'

/**
 * Map a failed TRON transfer to the error the widget renders and the host is
 * told about. `name` is UI copy; the classification travels as `reasonCode`
 * and is declared only for the wallet's own decline message.
 */
const INSUFFICIENT_BALANCE_TEXT = /not sufficient|insufficient|not enough/i

/**
 * The account cannot cover the transfer: no bandwidth or energy for it
 * (BANDWITH_ERROR), or no balance for it, which the node reports as a contract
 * validation failure whose reason names the shortfall ("Validate TransferContract
 * error, balance is not sufficient."). Wallets that broadcast on their own throw
 * the bare code as the message.
 */
function isInsufficientFunds(error: unknown, message: string): boolean {
    if (message === "BANDWITH_ERROR") return true
    if (!(error instanceof TronBroadcastError)) return false
    if (error.code === "BANDWITH_ERROR") return true
    return error.code === "CONTRACT_VALIDATE_ERROR" && INSUFFICIENT_BALANCE_TEXT.test(error.reason ?? '')
}

export function toTransferError(error: unknown): Error {
    const message = errorMessage(error)

    if (isInsufficientFunds(error, message)) {
        return walletActionError(ActionMessageType.InsufficientFunds, { message, cause: error })
    }
    if (message === "user reject this request") {
        return userRejectedError({ message, cause: error })
    }
    return walletActionError(ActionMessageType.UnexpectedErrorMessage, { message, cause: error })
}
