import type { WalletErrorReasonCode } from '@layerswap/widget-types'

type ErrorCandidate = {
    name?: string
    code?: string | number
    message?: string
    shortMessage?: string
    cause?: unknown
}

const RAW_CODE_LIMIT = 128

export function walletErrorCode(candidate: unknown): string | undefined {
    const code = (candidate as ErrorCandidate | undefined)?.code
    if (typeof code === 'string' && code) return code.slice(0, RAW_CODE_LIMIT)
    if (typeof code === 'number' && Number.isFinite(code)) return String(code)
    return undefined
}

const NAME_REASONS: Array<[RegExp, WalletErrorReasonCode]> = [
    // TransactionRejected is our adapter sentinel. A node's
    // TransactionRejectedRpcError does not mean the user declined a prompt.
    [/^UserRejected|^TransactionRejected$/i, 'user_rejected'],
    [/UnauthorizedProvider/i, 'unauthorized'],
    [/InsufficientFunds/i, 'insufficient_funds'],
    [/EstimateGas|GasEstimat|UnpredictableGas/i, 'gas_estimation_failed'],
    [/ContractFunction|CallException|Revert/i, 'contract_reverted'],
    [/Nonce|Replacement/i, 'nonce_or_replacement'],
    [/ChainNotConfigured|ChainNotAdded|SwitchChain/i, 'chain_not_added'],
    [/Disconnected|ProviderDisconnected/i, 'wallet_disconnected'],
    [/UnsupportedProviderMethod|MethodNotSupported|MethodNotFound/i, 'unsupported_method'],
    [/InvalidParams|InvalidInput/i, 'invalid_parameters'],
    [/InternalRpc/i, 'internal_rpc_error'],
    [/HttpRequestError|NetworkError|FetchError/i, 'network_error'],
    [/Timeout/i, 'timeout'],
]

const MESSAGE_REASONS: Array<[RegExp, WalletErrorReasonCode]> = [
    [/user rejected|user denied|rejected the request|user cancel/i, 'user_rejected'],
    [/insufficient funds|insufficient balance|exceeds balance|not enough/i, 'insufficient_funds'],
    [/cannot estimate gas|gas required exceeds|intrinsic gas|estimateGas/i, 'gas_estimation_failed'],
    [/execution reverted|revert/i, 'contract_reverted'],
    [/nonce too low|nonce has already|replacement transaction underpriced|already known/i, 'nonce_or_replacement'],
    [/unrecognized chain|chain not (added|configured)|wallet_addEthereumChain/i, 'chain_not_added'],
    [/disconnected|not connected/i, 'wallet_disconnected'],
    [/method not (supported|found)|unsupported method|does not support/i, 'unsupported_method'],
    [/invalid (params|parameters|argument)/i, 'invalid_parameters'],
    [/internal (json-rpc|rpc) error|internal error/i, 'internal_rpc_error'],
    [/network error|failed to fetch|load failed|econnre|socket hang up|fetch failed/i, 'network_error'],
    [/timed? ?out|timeout/i, 'timeout'],
]

const NUMERIC_CODE_REASONS: Record<string, WalletErrorReasonCode> = {
    '4001': 'user_rejected',
    '4100': 'unauthorized',
    '4200': 'unsupported_method',
    '4900': 'wallet_disconnected',
    '4901': 'wallet_disconnected',
    '4902': 'chain_not_added',
    '-32601': 'unsupported_method',
    '-32602': 'invalid_parameters',
    '-32603': 'internal_rpc_error',
    '-32004': 'unsupported_method',
}

const STRING_CODE_REASONS: Record<string, WalletErrorReasonCode> = {
    ACTION_REJECTED: 'user_rejected',
    INSUFFICIENT_FUNDS: 'insufficient_funds',
    UNPREDICTABLE_GAS_LIMIT: 'gas_estimation_failed',
    CALL_EXCEPTION: 'contract_reverted',
    NONCE_EXPIRED: 'nonce_or_replacement',
    REPLACEMENT_UNDERPRICED: 'nonce_or_replacement',
    TRANSACTION_REPLACED: 'nonce_or_replacement',
    UNSUPPORTED_OPERATION: 'unsupported_method',
    INVALID_ARGUMENT: 'invalid_parameters',
    NETWORK_ERROR: 'network_error',
    SERVER_ERROR: 'network_error',
    TIMEOUT: 'timeout',
    ETIMEDOUT: 'timeout',
    ECONNRESET: 'network_error',
}

/**
 * Bounded cause for wallet and provider failures. Structured codes win over
 * names, and names over message text. Explicit cancellation codes take priority
 * anywhere in the chain; otherwise the innermost structured cause wins over
 * a generic wrapper. Following `cause` handles viem/ethers wrappers without
 * importing either SDK. Returns `unknown_error` when nothing
 * recognizable exists, never a guess from arbitrary text.
 */
export function normalizeWalletErrorCode(error: unknown): WalletErrorReasonCode {
    const chain: ErrorCandidate[] = []
    let current: unknown = error
    while (current && typeof current === 'object' && chain.length < 8 && !chain.includes(current as ErrorCandidate)) {
        chain.push(current as ErrorCandidate)
        try { current = (current as ErrorCandidate).cause }
        catch { break }
    }
    for (const candidate of chain) {
        const code = walletErrorCode(candidate)
        if (code === '4001' || code?.toUpperCase() === 'ACTION_REJECTED') return 'user_rejected'
    }
    for (const candidate of [...chain].reverse()) {
        const code = walletErrorCode(candidate)
        if (code && NUMERIC_CODE_REASONS[code]) return NUMERIC_CODE_REASONS[code]
        if (code && STRING_CODE_REASONS[code.toUpperCase()]) return STRING_CODE_REASONS[code.toUpperCase()]
    }
    for (const candidate of chain) {
        const name = typeof candidate.name === 'string' ? candidate.name : ''
        const match = NAME_REASONS.find(([pattern]) => pattern.test(name))
        if (match) return match[1]
    }
    for (const candidate of chain) {
        const text = [candidate.shortMessage, candidate.message].filter(v => typeof v === 'string').join(' ')
        const match = MESSAGE_REASONS.find(([pattern]) => pattern.test(text))
        if (match) return match[1]
    }
    if (typeof error === 'string') {
        const match = MESSAGE_REASONS.find(([pattern]) => pattern.test(error))
        if (match) return match[1]
    }
    return 'unknown_error'
}
/** Execution and telemetry share the same rejection decision, without an SDK dependency. */
export function isUserRejection(error: unknown): boolean {
    return normalizeWalletErrorCode(error) === 'user_rejected'
}
