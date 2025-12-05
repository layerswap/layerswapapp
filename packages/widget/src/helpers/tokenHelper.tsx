import { SwapQuote } from "@/lib/apiClients/layerSwapApiClient"
import { Token } from "@/Models/Network"

export const resolveTokenUsdPrice = (token: Token | undefined, quote: SwapQuote | undefined) => {
    if (quote?.source_token?.symbol && quote?.source_token?.symbol === token?.symbol) {
        return quote.source_token.price_in_usd
    }
    if (quote?.destination_token?.symbol && quote?.destination_token?.symbol === token?.symbol) {
        return quote.destination_token.price_in_usd
    }
    return token?.price_in_usd
}