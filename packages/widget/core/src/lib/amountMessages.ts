import type { Token } from '@layerswap/widget-types'
import { ceilUsd } from '@/components/utils/formatUsdAmount'
import { ceilToDecimals } from '@layerswap/utils'

export function minimumAmountMessage(minimum: number, token: Pick<Token, 'symbol' | 'decimals'> | undefined, minimumInUsd?: number, isUsdMode = false): string {
    // Round up just as the Min shortcut does, so entering this value is valid.
    const amount = isUsdMode && minimumInUsd != null
        ? `$${ceilUsd(minimumInUsd)}`
        : token ? `${ceilToDecimals(minimum, token.decimals).toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: token.decimals })} ${token.symbol}` : String(minimum)
    return `Minimum is ${amount}`
}
