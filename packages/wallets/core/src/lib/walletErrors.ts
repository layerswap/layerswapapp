import { ActionMessageType, type WalletErrorReasonCode } from '@layerswap/widget-types'

type ErrorCandidate = {
    name?: string
    /** Set by an adapter through walletActionError / userRejectedError. */
    reasonCode?: unknown
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

// ---- Explicit classification. An adapter that knows why its call failed
// ---- declares it on the thrown error; the classifier reads that field before
// ---- any inference. Exhaustive against the WalletErrorReasonCode union, so
// ---- an unknown string on a foreign error is ignored and the taxonomy stays bounded.
const REASON_CODES: Record<WalletErrorReasonCode, true> = {
    user_rejected: true,
    unauthorized: true,
    insufficient_funds: true,
    gas_estimation_failed: true,
    contract_reverted: true,
    nonce_or_replacement: true,
    chain_not_added: true,
    wallet_disconnected: true,
    unsupported_method: true,
    invalid_parameters: true,
    internal_rpc_error: true,
    network_error: true,
    timeout: true,
    unknown_error: true,
}

export function isWalletErrorReasonCode(value: unknown): value is WalletErrorReasonCode {
    return typeof value === 'string' && Object.prototype.hasOwnProperty.call(REASON_CODES, value)
}

/**
 * An error thrown by a transfer provider: `name` is the ActionMessageType the
 * UI renders, `reasonCode` (optional) is what the host and telemetry are told.
 * The two are independent: a rejected label without a reason code is reported
 * as a failure.
 */
export type WalletActionError = Error & { reasonCode?: WalletErrorReasonCode }

export type WalletActionErrorInit = { message: string; cause?: unknown; reasonCode?: WalletErrorReasonCode }

/** Build the error an adapter throws: UI label plus, when known, the classification. */
export function walletActionError(name: ActionMessageType, init: WalletActionErrorInit): WalletActionError {
    const error = new Error(String(init.message), init.cause === undefined ? undefined : { cause: init.cause }) as WalletActionError
    error.name = name
    // Own enumerable property: hosts that JSON-serialize the error see it too.
    if (init.reasonCode !== undefined) error.reasonCode = init.reasonCode
    return error
}

/** The only sanctioned way to pair the rejected label with the `user_rejected` classification. */
export function userRejectedError(init: { message?: string; cause?: unknown } = {}): WalletActionError {
    return walletActionError(ActionMessageType.TransactionRejected, {
        message: init.message ?? 'Transaction rejected',
        cause: init.cause,
        reasonCode: 'user_rejected',
    })
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
        // ActionMessageType labels are UI copy and never classify. Adapters
        // declare declines with userRejectedError / walletActionError({ reasonCode }).
        // A node's TransactionRejectedRpcError does not mean the user declined a prompt.
        [/^UserRejected/i, 'user_rejected'],
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

// ---- Decline text. Only phrasing that names the user (or a wallet SDK's own
// ---- decline token) counts: "origin rejected the request" is a node or relay
// ---- refusing, not the user. A revert reason is contract output and never counts.
// "denied by the user" is Ledger's decline text (@ledgerhq/errors
// 'Condition of use not satisfied (denied by the user?)'), relayed by MetaMask as -32603.
// 'user reject this request' (TRON adapters), 'USER_REFUSED_OP' (Starknet
// wallets), 'Reject request' (TON Connect SDK) are the decline phrases the
// chain adapters matched by hand before declaring declines explicitly.
const DECLINE_TEXT = /user rejected|user denied|user cancel|user reject\b|USER_REFUSED_OP|Reject request|denied by the user/i
// JSON-RPC 2.0 reserves -32000..-32099 for server errors: the text is the
// node's (geth: funds, nonce, "execution reverted: <reason>"). Some WalletConnect
// wallets still answer a declined prompt with -32000 "User rejected ...", so on
// these codes only text that *starts* with the user declining counts.
const SERVER_ERROR_DECLINE_TEXT = /^\s*user (rejected|denied)\b/i
const REVERT_TEXT = /revert/i

function isServerErrorCode(code: string | undefined): boolean {
    const value = Number(code)
    return Number.isInteger(value) && value <= -32000 && value >= -32099
}

function isDeclineText(text: string, code?: string): boolean {
    if (REVERT_TEXT.test(text)) return false
    return (isServerErrorCode(code) ? SERVER_ERROR_DECLINE_TEXT : DECLINE_TEXT).test(text)
}

const MESSAGE_RULES: Record<TextTier, NameRules> = {
    descriptive: [
        // user_rejected is decided by isDeclineText, ahead of these rules.
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
    return 'code' in value || 'message' in value || 'name' in value || 'cause' in value || 'reasonCode' in value
        || 'error' in value || 'originalError' in value || 'shortMessage' in value
}

/** Innermost first: deeper nodes describe the raw failure, wrappers add noise. */
function collectCandidates(error: unknown): ErrorCandidate[] {
    return collectNodes(error).sort((a, b) => b.depth - a.depth).map(node => node.value)
}

/** Outermost first: the adapter that wrapped a failure has the final say on its meaning. */
function declaredReason(error: unknown): WalletErrorReasonCode | undefined {
    const nodes = collectNodes(error).sort((a, b) => a.depth - b.depth)
    for (const { value } of nodes) {
        if (isWalletErrorReasonCode(value.reasonCode)) return value.reasonCode
    }
    return undefined
}

function collectNodes(error: unknown): Array<{ value: ErrorCandidate; depth: number }> {
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
    return nodes
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
    if (!text) return undefined
    if (tier === 'descriptive' && isDeclineText(text, walletErrorCode(candidate))) return 'user_rejected'
    return MESSAGE_RULES[tier].find(([pattern]) => pattern.test(text))?.[1]
}

function rawTextReason(error: unknown, tier: TextTier): WalletErrorReasonCode | undefined {
    if (typeof error !== 'string') return undefined
    if (tier === 'descriptive' && isDeclineText(error)) return 'user_rejected'
    return MESSAGE_RULES[tier].find(([pattern]) => pattern.test(error))?.[1]
}

/**
 * Evidence tier decides precedence, not the field a signal came from:
 *   0. an explicit `reasonCode` set by an adapter (walletActionError /
 *      userRejectedError) wins anywhere in the chain, outermost first;
 *   1. a definitive cancellation signal anywhere in the tree;
 *   2. definitive codes/names, innermost first;
 *   3. descriptive message text, innermost first (SDK bucket classes contribute no text);
 *      decline text must name the user, never inside a revert reason, and on a
 *      JSON-RPC server error (-32000..-32099) must start with "user rejected/denied";
 *   4. fallback buckets (-32603, SERVER_ERROR, InternalRpcError, 'internal error'), innermost first;
 *   5. unknown_error.
 * ActionMessageType labels (`name`) are UI copy and never classify: a bare
 * `TransactionRejected` name is a failure until an adapter declares otherwise.
 * -32603 is the JSON-RPC catch-all and @metamask/rpc-errors' serializer fallback,
 * so it can never outrank text or a nested cause. Wrappers under cause/data/
 * originalError/error are transparent. Returns `unknown_error` when nothing
 * recognizable exists, never a guess from arbitrary text.
 */
export function normalizeWalletErrorCode(error: unknown): WalletErrorReasonCode {
    const declared = declaredReason(error)
    if (declared) return declared
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
