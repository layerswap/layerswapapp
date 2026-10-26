/**
 * A node answers a broadcast with `{ result, code, message, txid }`. A declined
 * broadcast has `result: false` and names its reason in `code`
 * (SIGERROR, BANDWITH_ERROR, DUP_TRANSACTION_ERROR, SERVER_BUSY, ...) with a
 * hex-encoded `message`. TronWeb types `code` as a numeric enum; the node
 * sends the enum's name.
 */
export type TronBroadcastResponse = {
    result?: boolean
    code?: unknown
    message?: unknown
    txid?: unknown
}

export const DUPLICATE_TRANSACTION_CODE = 'DUP_TRANSACTION_ERROR'

export const broadcastCode = (response: TronBroadcastResponse): string | undefined =>
    typeof response.code === 'string' && response.code ? response.code : undefined

/**
 * The signed transaction is already known to the network under the id it was
 * signed with. A duplicate verdict that names another id is not this deposit.
 */
export const isDuplicateBroadcast = (response: TronBroadcastResponse, txID: string): boolean =>
    broadcastCode(response) === DUPLICATE_TRANSACTION_CODE
    && (typeof response.txid !== 'string' || !response.txid || response.txid === txID)

const HEX_TEXT = /^(?:0x)?(?:[0-9a-f]{2})+$/i
const utf8 = new TextDecoder('utf-8', { fatal: true })

/** Hex-encoded UTF-8 as text; undefined when the value is not hex or does not decode as text, so a hex-looking word stays as it is. */
export const hexToText = (value: string): string | undefined => {
    if (!HEX_TEXT.test(value)) return undefined
    const hex = value.replace(/^0x/i, '')
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
    try {
        return utf8.decode(bytes)
    } catch {
        return undefined
    }
}

/** Text as hex-encoded UTF-8, the form TronWeb takes for a transaction's data. */
export const textToHex = (value: string): string =>
    Array.from(new TextEncoder().encode(value), byte => byte.toString(16).padStart(2, '0')).join('')

/** The node's reason as text; it arrives hex-encoded, occasionally as plain text. */
export const broadcastMessage = (response: TronBroadcastResponse): string | undefined => {
    const message = response.message
    if (typeof message !== 'string' || !message) return undefined
    return hexToText(message) ?? message
}

/** A declined broadcast, with the node's code and decoded reason and the response as the cause. */
export class TronBroadcastError extends Error {
    readonly code: string
    /** The node's decoded reason, when it sent one. */
    readonly reason: string | undefined

    constructor(readonly response: TronBroadcastResponse) {
        const code = broadcastCode(response) ?? 'BROADCAST_FAILED'
        const reason = broadcastMessage(response)
        super(reason ? `${code}: ${reason}` : code, { cause: response })
        this.name = 'TronBroadcastError'
        this.code = code
        this.reason = reason
    }
}
