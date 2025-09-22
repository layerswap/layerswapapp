import { FC, useMemo } from "react";
import { SwapQuote } from "@/lib/apiClients/layerSwapApiClient";
import { Triangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip";

type PriceImpactProps = {
    quote: SwapQuote | undefined;
}
export const PriceImpact: FC<PriceImpactProps> = ({ quote }) => {
    const receive_amount = quote?.receive_amount
    const requested_amount = quote?.requested_amount

    const toAmountUSD = useMemo(() => {
        if (!receive_amount || !quote?.destination_token?.price_in_usd) return undefined;
        return receive_amount * quote.destination_token.price_in_usd;
    }, [receive_amount, quote?.destination_token?.price_in_usd]);

    const fromAmountUSD = useMemo(() => {
        if (!requested_amount || !quote?.source_token?.price_in_usd) return undefined;
        return requested_amount * quote.source_token.price_in_usd;
    }, [requested_amount, quote?.source_token?.price_in_usd]);

    const priceImpact = useMemo(() => {
        if (fromAmountUSD === undefined || toAmountUSD === undefined) return undefined;
        return Number((toAmountUSD - fromAmountUSD).toFixed(2));
    }, [fromAmountUSD, toAmountUSD]);

    if (priceImpact === undefined) return null;

    return (<>
        <Tooltip>
            <TooltipTrigger asChild>
                <span className="flex items-center text-sm text-secondary-text cursor-default">
                    <span className="flex items-center gap-0.5">
                        <span>(</span>
                        <Triangle
                            aria-label={priceImpact < 0 ? "Negative price impact" : "Positive price impact"}
                            className={`w-3 h-3 stroke-1 fill-current transition-transform ${priceImpact < 0 ? "rotate-180" : ""
                                }`}
                        />
                        <span>$</span>{priceImpact}<span>)</span>
                    </span>
                </span>
            </TooltipTrigger>
            <TooltipContent side="top" align="center" className="!bg-secondary-300 !border-secondary-300 !text-secondary-text text-xs font-medium">
                <p>This is the difference between the USD value of</p>
                <p>the token you send and the token you receive.</p>
            </TooltipContent>
        </Tooltip>
    </>)
}