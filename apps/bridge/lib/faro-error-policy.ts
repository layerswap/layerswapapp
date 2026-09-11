import type { ErrorEventType } from '@layerswap/widget-types'

const DIAGNOSTIC_TYPES = new Set<ErrorEventType['type']>([
    'BalanceResolverError', 'BalanceProviderError', 'MaxPriorityFeePerGasError',
    'FeesPerGasError', 'GasPriceError', 'GasProviderError', 'GasMiscalculation',
    'APIError', 'SwapCatchupError',
])

/** The operation's lifecycle outcome owns impact; an interceptor does not. */
export function widgetErrorImpact(event: ErrorEventType): 'diagnostic' | 'expected' | 'user' {
    if (event.name === 'TransactionRejected'
        || /user rejected|user denied|rejected the request/i.test(event.message)) return 'expected'
    return DIAGNOSTIC_TYPES.has(event.type) ? 'diagnostic' : 'user'
}
