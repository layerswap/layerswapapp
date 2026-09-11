import type { SwapLifecycleEvent, WalletErrorReasonCode } from '@layerswap/widget-types'
import { getErrorOccurrenceId } from '@layerswap/widget-types'
import type { SwapFormValues } from '@/components/Pages/Swap/Form/SwapFormValues'
import type { SwapBasicData, SwapDetails } from '@/lib/apiClients/layerSwapApiClient'

export type SwapLifecycleContext = Partial<Pick<
    SwapLifecycleEvent,
    | 'swapId'
    | 'depositMethod'
    | 'requestedAmount'
    | 'fromAddress'
    | 'toAddress'
    | 'sourceNetwork'
    | 'destinationNetwork'
    | 'sourceToken'
    | 'destinationToken'
>>

export function lifecycleContextFromForm(values: SwapFormValues): SwapLifecycleContext {
    return {
        depositMethod: values.depositMethod,
        requestedAmount: values.amount,
        toAddress: values.destination_address,
        sourceNetwork: values.from?.name,
        destinationNetwork: values.to?.name,
        sourceToken: values.fromAsset?.symbol,
        destinationToken: values.toAsset?.symbol,
    }
}

export function lifecycleContextFromSwap(
    swap: SwapBasicData,
    details?: SwapDetails,
): SwapLifecycleContext {
    return {
        swapId: details?.id,
        depositMethod: swap.use_deposit_address ? 'deposit_address' : 'wallet',
        requestedAmount: swap.requested_amount?.toString(),
        fromAddress: details?.source_address,
        toAddress: swap.destination_address,
        sourceNetwork: swap.source_network?.name,
        destinationNetwork: swap.destination_network?.name,
        sourceToken: swap.source_token?.symbol,
        destinationToken: swap.destination_token?.symbol,
    }
}

type ErrorCandidate = {
    name?: string
    code?: string | number
    message?: string
    shortMessage?: string
    cause?: unknown
    response?: { data?: { error?: { code?: string; message?: string } } }
}

const RAW_CODE_LIMIT = 128

function rawErrorCode(candidate: ErrorCandidate | undefined): string | undefined {
    const code = candidate?.code
    if (typeof code === 'string' && code) return code.slice(0, RAW_CODE_LIMIT)
    if (typeof code === 'number' && Number.isFinite(code)) return String(code)
    return undefined
}

const NAME_REASONS: Array<[RegExp, WalletErrorReasonCode]> = [
    [/UserRejected|TransactionRejected/i, 'user_rejected'],
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
    '4100': 'user_rejected',
    '4200': 'unsupported_method',
    '4900': 'wallet_disconnected',
    '4901': 'wallet_disconnected',
    '4902': 'chain_not_added',
    '-32601': 'unsupported_method',
    '-32602': 'invalid_parameters',
    '-32603': 'internal_rpc_error',
    '-32000': 'insufficient_funds',
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
 * names, and names over message text; the walk follows `cause` so a wrapped
 * viem/ethers error still classifies. Returns `unknown_error` when nothing
 * recognizable exists, never a guess from arbitrary text.
 */
export function normalizeWalletErrorCode(error: unknown): WalletErrorReasonCode {
    const chain: ErrorCandidate[] = []
    let current: unknown = error
    while (current && typeof current === 'object' && chain.length < 8 && !chain.includes(current as ErrorCandidate)) {
        chain.push(current as ErrorCandidate)
        current = (current as ErrorCandidate).cause
    }
    for (const candidate of chain) {
        const code = rawErrorCode(candidate)
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

export function lifecycleErrorDetails(error: unknown): Pick<SwapLifecycleEvent, 'reasonCode' | 'reason' | 'errorCode' | 'occurrenceId'> {
    const candidate = error as ErrorCandidate
    const apiError = candidate?.response?.data?.error
    const errorCode = apiError?.code || rawErrorCode(candidate)
    const details: Pick<SwapLifecycleEvent, 'reasonCode' | 'reason' | 'errorCode' | 'occurrenceId'> = {
        occurrenceId: getErrorOccurrenceId(error),
        // API codes are already bounded server-side; wallet/provider codes are normalized.
        reasonCode: apiError?.code || normalizeWalletErrorCode(error),
        reason: apiError?.message || candidate?.shortMessage || candidate?.message || String(error),
    }
    if (errorCode) details.errorCode = errorCode
    return details
}
