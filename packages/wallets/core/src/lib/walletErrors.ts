import type { WalletErrorReasonCode } from '@layerswap/widget-types'

type ErrorCandidate = {
    name?: string
    code?: string | number
    message?: string
    shortMessage?: string
    /** viem BaseError carries the cause text here. */
    details?: string
    cause?: unknown
}

const RAW_CODE_LIMIT = 128
const MAX_NODES = 16

export function walletErrorCode(candidate: unknown): string | undefined {
    const code = (candidate as ErrorCandidate | undefined)?.code
    if (typeof code === 'string' && code) return code.slice(0, RAW_CODE_LIMIT)
    if (typeof code === 'number' && Number.isFinite(code)) return String(code)
    return undefined
}

// ---- Rule tables. Every rule carries an evidence tier; the tier, not the
// ---- source (code / name / message), decides precedence.
//   definitive : the emitter assigned a spec- or SDK-defined meaning
//   descriptive: human-readable text naming the failure
//   fallback   : catch-all buckets (JSON-RPC -32603, ethers SERVER_ERROR,
//                viem InternalRpcError, "internal error") that only say
//                "something failed"

type Tier = 'definitive' | 'fallback'
type TextTier = 'descriptive' | 'fallback'
type NameRules = Array<[RegExp, WalletErrorReasonCode]>

const CODE_RULES: Record<Tier, Record<string, WalletErrorReasonCode>> = {
    definitive: {
        '4001': 'user_rejected',
        // CAIP-25 "User Rejected"; viem maps it to UserRejectedRequestError (utils/buildRequest.js).
        '5000': 'user_rejected',
        ACTION_REJECTED: 'user_rejected',
        '4100': 'unauthorized',
        '4200': 'unsupported_method',
        '-32601': 'unsupported_method',
        '-32004': 'unsupported_method',
        UNSUPPORTED_OPERATION: 'unsupported_method',
        '4900': 'wallet_disconnected',
        '4901': 'wallet_disconnected',
        '4902': 'chain_not_added',
        '-32602': 'invalid_parameters',
        INVALID_ARGUMENT: 'invalid_parameters',
        INSUFFICIENT_FUNDS: 'insufficient_funds',
        UNPREDICTABLE_GAS_LIMIT: 'gas_estimation_failed',
        CALL_EXCEPTION: 'contract_reverted',
        NONCE_EXPIRED: 'nonce_or_replacement',
        REPLACEMENT_UNDERPRICED: 'nonce_or_replacement',
        TRANSACTION_REPLACED: 'nonce_or_replacement',
        NETWORK_ERROR: 'network_error',
        ECONNRESET: 'network_error',
        TIMEOUT: 'timeout',
        ETIMEDOUT: 'timeout',
    },
    fallback: {
        // JSON-RPC "Internal error": the spec catch-all and @metamask/rpc-errors' serializer fallback.
        '-32603': 'internal_rpc_error',
        // ethers v5 wraps every JSON-RPC error body as SERVER_ERROR with the body under `.error`.
        SERVER_ERROR: 'network_error',
        // viem -1 / ethers UNKNOWN_ERROR carry no reason at all: they are not rules.
    },
}

const NAME_RULES: Record<Tier, NameRules> = {
    definitive: [
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
        [/InvalidParams/i, 'invalid_parameters'],
        [/HttpRequestError|NetworkError|FetchError/i, 'network_error'],
        [/Timeout/i, 'timeout'],
    ],
    fallback: [
        [/InternalRpc/i, 'internal_rpc_error'],
    ],
}

// SDK bucket classes whose own text is boilerplate ("An internal error was
// received.", "Missing or invalid parameters.") plus a copy of the cause text
// under "Details:". The cause node is already a candidate, so these contribute
// no descriptive text. viem maps every node -32000 to InvalidInputRpcError
// although geth uses -32000 for funds / nonce / revert failures.
const BUCKET_NAMES = /InternalRpc|UnknownRpc|InvalidInputRpc|^RpcError$|^RpcRequestError$|^BaseError$/i

const MESSAGE_RULES: Record<TextTier, NameRules> = {
    descriptive: [
        // "denied by the user" is Ledger's decline text (@ledgerhq/errors
        // 'Condition of use not satisfied (denied by the user?)'), relayed by MetaMask as -32603.
        [/user rejected|user denied|rejected the request|user cancel|denied by the user/i, 'user_rejected'],
        [/insufficient funds|insufficient balance|exceeds balance|not enough/i, 'insufficient_funds'],
        [/cannot estimate gas|gas required exceeds|intrinsic gas|estimateGas/i, 'gas_estimation_failed'],
        [/execution reverted|revert/i, 'contract_reverted'],
        [/nonce too low|nonce has already|replacement transaction underpriced|already known/i, 'nonce_or_replacement'],
        [/unrecognized chain|chain not (added|configured)|wallet_addEthereumChain/i, 'chain_not_added'],
        [/disconnected|not connected/i, 'wallet_disconnected'],
        [/method not (supported|found)|unsupported method|does not support/i, 'unsupported_method'],
        [/invalid (params|parameters|argument)/i, 'invalid_parameters'],
        [/network error|failed to fetch|load failed|econnre|socket hang up|fetch failed/i, 'network_error'],
        [/timed? ?out|timeout/i, 'timeout'],
    ],
    fallback: [
        [/internal (json-rpc|rpc) error|internal error/i, 'internal_rpc_error'],
    ],
}

// ---- Candidate collection: a bounded tree walk over the edges wallets and
// ---- SDKs actually use to nest the real failure (viem/ethers `cause`,
// ---- JSON-RPC `data`, ethers v5 `error`, MetaMask `originalError`).
const NESTED_KEYS = ['cause', 'data', 'originalError', 'error'] as const

function isErrorLike(value: unknown): value is ErrorCandidate {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false
    return 'code' in value || 'message' in value || 'name' in value || 'cause' in value
        || 'error' in value || 'originalError' in value || 'shortMessage' in value
}

/** Innermost first: deeper nodes describe the raw failure, wrappers add noise. */
function collectCandidates(error: unknown): ErrorCandidate[] {
    const nodes: Array<{ value: ErrorCandidate; depth: number }> = []
    const seen = new Set<object>()
    const stack: Array<[unknown, number]> = [[error, 0]]
    while (stack.length && nodes.length < MAX_NODES) {
        const [value, depth] = stack.pop() as [unknown, number]
        if (!value || typeof value !== 'object' || seen.has(value)) continue
        seen.add(value)
        nodes.push({ value: value as ErrorCandidate, depth })
        for (const key of NESTED_KEYS) {
            let next: unknown
            try { next = (value as Record<string, unknown>)[key] } catch { continue }
            if (isErrorLike(next)) stack.push([next, depth + 1])
        }
    }
    return nodes.sort((a, b) => b.depth - a.depth).map(node => node.value)
}

function textOf(candidate: ErrorCandidate): string {
    return [candidate.shortMessage, candidate.message, candidate.details].filter(v => typeof v === 'string').join(' ')
}

function codeReason(candidate: ErrorCandidate, tier: Tier): WalletErrorReasonCode | undefined {
    const code = walletErrorCode(candidate)
    if (!code) return undefined
    return CODE_RULES[tier][code] ?? CODE_RULES[tier][code.toUpperCase()]
}

function nameReason(candidate: ErrorCandidate, tier: Tier): WalletErrorReasonCode | undefined {
    const name = typeof candidate.name === 'string' ? candidate.name : ''
    return NAME_RULES[tier].find(([pattern]) => pattern.test(name))?.[1]
}

function messageReason(candidate: ErrorCandidate, tier: TextTier): WalletErrorReasonCode | undefined {
    if (tier === 'descriptive' && typeof candidate.name === 'string' && BUCKET_NAMES.test(candidate.name)) return undefined
    const text = textOf(candidate)
    return text ? MESSAGE_RULES[tier].find(([pattern]) => pattern.test(text))?.[1] : undefined
}

function rawTextReason(error: unknown, tier: TextTier): WalletErrorReasonCode | undefined {
    if (typeof error !== 'string') return undefined
    return MESSAGE_RULES[tier].find(([pattern]) => pattern.test(error))?.[1]
}

/**
 * Evidence tier decides precedence, not the field a signal came from:
 *   1. a definitive cancellation signal anywhere in the tree;
 *   2. definitive codes/names, innermost first;
 *   3. descriptive message text, innermost first (SDK bucket classes contribute no text);
 *   4. fallback buckets (-32603, SERVER_ERROR, InternalRpcError, 'internal error'), innermost first;
 *   5. unknown_error.
 * -32603 is the JSON-RPC catch-all and @metamask/rpc-errors' serializer fallback,
 * so it can never outrank text or a nested cause. Wrappers under cause/data/
 * originalError/error are transparent. Returns `unknown_error` when nothing
 * recognizable exists, never a guess from arbitrary text.
 */
export function normalizeWalletErrorCode(error: unknown): WalletErrorReasonCode {
    const chain = collectCandidates(error)
    for (const candidate of chain) {
        if (codeReason(candidate, 'definitive') === 'user_rejected' || nameReason(candidate, 'definitive') === 'user_rejected') return 'user_rejected'
    }
    for (const candidate of chain) {
        const reason = codeReason(candidate, 'definitive') ?? nameReason(candidate, 'definitive')
        if (reason) return reason
    }
    for (const candidate of chain) {
        const reason = messageReason(candidate, 'descriptive')
        if (reason) return reason
    }
    const descriptive = rawTextReason(error, 'descriptive')
    if (descriptive) return descriptive
    for (const candidate of chain) {
        const reason = codeReason(candidate, 'fallback') ?? nameReason(candidate, 'fallback') ?? messageReason(candidate, 'fallback')
        if (reason) return reason
    }
    return rawTextReason(error, 'fallback') ?? 'unknown_error'
}

/** Execution and telemetry share the same rejection decision, without an SDK dependency. */
export function isUserRejection(error: unknown): boolean {
    return normalizeWalletErrorCode(error) === 'user_rejected'
}
