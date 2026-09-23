import { ActionMessageType } from '@layerswap/widget-types'
import { isUserRejection, userRejectedError, walletActionError } from '@layerswap/wallet-core/errors'

function errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message
    if (typeof error === 'string') return error
    const message = (error as { message?: unknown } | undefined)?.message
    return typeof message === 'string' ? message : String(error)
}

/**
 * Map a failed Paradex transfer to the error the widget renders and the host
 * is told about. Every step of the transfer that can fail is a wallet prompt
 * (L1 chain switch, L1/Starknet authorization signature, `execute`), so a
 * decline is recognised only by structured evidence from the backing wallet
 * (EIP-1193 4001 / viem UserRejectedRequestError / Starknet USER_REFUSED_OP)
 * through the shared classifier — never by a 'reject' substring, which a
 * sequencer or gateway rejection also contains.
 */
export function toTransferError(error: unknown): Error {
    const message = errorMessage(error)
    if (isUserRejection(error)) return userRejectedError({ message, cause: error })
    return walletActionError(ActionMessageType.UnexpectedErrorMessage, { message, cause: error })
}
