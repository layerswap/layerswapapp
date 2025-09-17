import { FC, useMemo } from "react";
import { Quote } from "@/lib/apiClients/layerSwapApiClient";
import { Triangle } from "lucide-react";

type PriceImpactProps = {
    fee: Quote | undefined;
}
export const PriceImpact: FC<PriceImpactProps> = ({ fee }) => {
    const receive_amount = fee?.quote.receive_amount
    const requested_amount = fee?.quote.requested_amount

    const toAmountUSD = useMemo(() => {
        if (!receive_amount || !fee?.quote?.destination_token?.price_in_usd) return undefined;
        return receive_amount * fee.quote.destination_token.price_in_usd;
    }, [receive_amount, fee?.quote?.destination_token?.price_in_usd]);

    const fromAmountUSD = useMemo(() => {
        if (!requested_amount || !fee?.quote?.source_token?.price_in_usd) return undefined;
        return requested_amount * fee.quote.source_token.price_in_usd;
    }, [requested_amount, fee?.quote?.source_token?.price_in_usd]);

    const priceImpact = useMemo(() => {
        if (fromAmountUSD === undefined || fromAmountUSD === 0 || toAmountUSD === undefined) return undefined;
        return Number((((toAmountUSD - fromAmountUSD) / fromAmountUSD) * 100).toFixed(2));
    }, [fromAmountUSD, toAmountUSD]);

    return (<>
        <span className="flex items-center text-sm text-secondary-text">
            {priceImpact !== undefined && (
                <span className="flex items-center gap-0.5">
                    (
                    <Triangle
                        className={`w-3 h-3 stroke-1 fill-current transition-transform ${priceImpact < 0 ? "rotate-180" : ""
                            }`}
                    />
                    {priceImpact}%)
                </span>
            )}
        </span>
    </>)
}