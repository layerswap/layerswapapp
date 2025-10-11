import { Quote } from '@/lib/apiClients/layerSwapApiClient'
import { truncateDecimals } from '../../utils/RoundDecimals'
import { SwapValues } from '..'

export function deriveQuoteComputed({
    values,
    quote,
    reward,
    gasData,
    gasTokenPriceInUsd,
}: {
    values: SwapValues
    quote: Quote['quote'] | undefined
    reward: Quote['reward'] | undefined
    gasData: { gas?: number; token?: { symbol?: string } } | undefined
    gasTokenPriceInUsd: number | undefined
}) {
    const gasFeeInUsd = gasData?.gas && gasTokenPriceInUsd ? gasData.gas * gasTokenPriceInUsd : null
    const lsFeeAmountInUsd = quote?.total_fee_in_usd
    const displayLsFeeInUsd = lsFeeAmountInUsd != null ? (lsFeeAmountInUsd < 0.01 ? '<$0.01' : `$${lsFeeAmountInUsd.toFixed(2)}`) : null
    const displayGasFeeInUsd = gasFeeInUsd != null ? (gasFeeInUsd < 0.01 ? '<$0.01' : `$${gasFeeInUsd.toFixed(2)}`) : null
    const displayLsFee = quote?.total_fee !== undefined ? truncateDecimals(quote.total_fee, values.fromAsset?.decimals) : undefined
    const currencyName = values.fromAsset?.symbol || ''
    const receiveAtLeast = quote?.min_receive_amount

    return {
        gasFeeInUsd,
        lsFeeAmountInUsd,
        displayLsFeeInUsd,
        displayGasFeeInUsd,
        displayLsFee,
        currencyName,
        receiveAtLeast,
        avgCompletionTime: quote?.avg_completion_time,
        reward,
    }
}