import { QuoteTokenPrices } from "@/hooks/useFee"
import { Token } from "@layerswap/widget-types";

export const resolveTokenUsdPrice = (token: Pick<Token, 'symbol'> & Partial<Pick<Token, 'price_in_usd'>> | undefined, quote: QuoteTokenPrices | undefined) => {
    if (quote?.source_token?.symbol && quote?.source_token?.symbol === token?.symbol) {
        return quote.source_token.price_in_usd
    }
    if (quote?.destination_token?.symbol && quote?.destination_token?.symbol === token?.symbol) {
        return quote.destination_token.price_in_usd
    }
    return token?.price_in_usd
}