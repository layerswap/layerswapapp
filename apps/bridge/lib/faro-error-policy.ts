import type { ErrorEventType } from '@layerswap/widget-types'
import { isUserRejection } from '@layerswap/wallet-core/errors'

const DIAGNOSTIC_TYPES = new Set<ErrorEventType['type']>([
    'BalanceResolverError', 'BalanceProviderError', 'MaxPriorityFeePerGasError',
    'FeesPerGasError', 'GasPriceError', 'GasProviderError', 'GasMiscalculation',
    'APIError', 'SwapCatchupError',
])

/** The operation's lifecycle outcome owns impact; an interceptor does not. */
export function widgetErrorImpact(event: ErrorEventType): 'diagnostic' | 'expected' | 'user' {
    if (event.reasonCode ? event.reasonCode === 'user_rejected' : isUserRejection(event)) return 'expected'
    return DIAGNOSTIC_TYPES.has(event.type) ? 'diagnostic' : 'user'
}
