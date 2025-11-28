import { SwapQuote } from "./apiClients/layerSwapApiClient";

export function CalculateMinimalAuthorizeAmount(usd_price: number, amount: number) {
    return Math.ceil((usd_price * amount) + (usd_price * amount * 0.02))
}

type PriceImpactValues = {
    receiveAmountUSD?: number;
    requestedAmountUSD?: number;
    priceImpact?: number;
    layerswapFees?: number;
    bridgeExpenses?: number;
    marketImpact?: number;
    priceImpactPercentage?: number;
    marketImpactPercentage?: number;
    highMarketPriceImpact?: boolean | undefined;
    criticalMarketPriceImpact?: boolean | undefined;
    minReceiveAmountUSD?: string | undefined;
};

export const resolvePriceImpactValues = (quote: SwapQuote | undefined): PriceImpactValues => {

    const receiveAmount = quote?.receive_amount;
    const requestedAmount = quote?.requested_amount;
    const sourceTokenPriceUsd = quote?.source_token?.price_in_usd;
    const destinationTokenPriceUsd = quote?.destination_token?.price_in_usd;
    const serviceFee = quote?.service_fee;
    const bridgeFee = quote?.blockchain_fee;

    const receiveAmountUSD = receiveAmount && destinationTokenPriceUsd
        ? receiveAmount * destinationTokenPriceUsd
        : undefined;

    const requestedAmountUSD = requestedAmount && sourceTokenPriceUsd
        ? requestedAmount * sourceTokenPriceUsd
        : undefined;

    const priceImpact = requestedAmountUSD !== undefined && receiveAmountUSD !== undefined
        ? receiveAmountUSD - requestedAmountUSD
        : undefined;

    const layerswapFees = serviceFee != null && sourceTokenPriceUsd != null
        ? serviceFee * sourceTokenPriceUsd
        : undefined;

    const bridgeExpenses = bridgeFee != null && sourceTokenPriceUsd != null
        ? bridgeFee * sourceTokenPriceUsd
        : undefined;

    const marketImpact = priceImpact !== undefined && layerswapFees !== undefined && bridgeExpenses !== undefined
        ? priceImpact + Number(layerswapFees) + Number(bridgeExpenses)
        : undefined;

    const priceImpactPercentage = requestedAmountUSD !== undefined && receiveAmountUSD !== undefined
        ? Number((((receiveAmountUSD - requestedAmountUSD) / requestedAmountUSD) * 100).toFixed(2))
        : undefined;

    const marketImpactPercentage = marketImpact !== undefined && requestedAmountUSD !== undefined && requestedAmountUSD > 0
        ? Number(((marketImpact / requestedAmountUSD) * 100).toFixed(2))
        : undefined;

    const highMarketPriceImpact = marketImpactPercentage ? marketImpactPercentage < -5 : false;
    const criticalMarketPriceImpact = marketImpactPercentage ? marketImpactPercentage < -10 : false;

    const minReceiveAmountUSD = quote?.min_receive_amount && destinationTokenPriceUsd != null
        ? Number(quote.min_receive_amount * destinationTokenPriceUsd).toFixed(2)
        : undefined;

    return {
        receiveAmountUSD,
        requestedAmountUSD,
        priceImpact,
        layerswapFees,
        bridgeExpenses,
        marketImpact,
        priceImpactPercentage,
        marketImpactPercentage,
        highMarketPriceImpact,
        criticalMarketPriceImpact,
        minReceiveAmountUSD,
    };
};
