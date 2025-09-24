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
    const sourceTokenPriceInUsd = quote?.source_token?.price_in_usd
    const destinationTokenPriceInUsd = quote?.destination_token?.price_in_usd

    const toAmountUSD = useMemo(() => {
        if (!receive_amount || !destinationTokenPriceInUsd) return undefined;
        return receive_amount * destinationTokenPriceInUsd;
    }, [receive_amount, destinationTokenPriceInUsd]);

    const fromAmountUSD = useMemo(() => {
        if (!requested_amount || !sourceTokenPriceInUsd) return undefined;
        return requested_amount * sourceTokenPriceInUsd;
    }, [requested_amount, sourceTokenPriceInUsd]);

    const priceImpact = useMemo(() => {
        if (fromAmountUSD === undefined || toAmountUSD === undefined) return undefined;
        return Number((toAmountUSD - fromAmountUSD).toFixed(2));
    }, [fromAmountUSD, toAmountUSD]);

    const serviceFee = useMemo(() => {
        if (quote?.service_fee == null || sourceTokenPriceInUsd == null) return undefined;
        return Math.abs(quote?.service_fee * sourceTokenPriceInUsd).toFixed(2);
    }, [quote?.service_fee, sourceTokenPriceInUsd]);

    const bridgeExpenses = useMemo(() => {
        if (quote?.blockchain_fee == null || sourceTokenPriceInUsd == null) return undefined;
        return Math.abs(quote?.blockchain_fee * sourceTokenPriceInUsd).toFixed(2);
    }, [quote?.blockchain_fee, sourceTokenPriceInUsd]);

    const marketImpact = useMemo(() => {
        if (priceImpact === undefined || serviceFee === undefined || bridgeExpenses === undefined) return undefined;
        return (priceImpact + Number(serviceFee) + Number(bridgeExpenses)).toFixed(2);
    }, [priceImpact, serviceFee, bridgeExpenses, quote?.source_token?.decimals]);

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
                        <span>
                            {priceImpact < 0 ? `-$${Math.abs(priceImpact)}` : `$${priceImpact}`}
                        </span>
                        <span>)</span>
                    </span>
                </span>
            </TooltipTrigger>
            <TooltipContent side="top" align="center" className="!bg-secondary-500 !border-secondary-500 !text-secondary-text text-xs font-normal">
                <p className="text-primary-text font-medium text-sm flex items-baseline space-x-0.5 mb-1">
                    <span>Price impact:</span>
                    <Triangle
                        aria-label={priceImpact < 0 ? "Negative price impact" : "Positive price impact"}
                        className={`ml-1 w-3 h-3 stroke-1 fill-current transition-transform ${priceImpact < 0 ? "rotate-180" : ""}`}
                    />
                    <span>{priceImpact < 0 ? `-$${Math.abs(priceImpact)}` : `$${priceImpact}`}</span>
                </p>
                <p>This is the difference between the USD value of</p>
                <p>the token you send and the token you receive.</p>
                <ul className="mt-3 space-y-2 ">
                    <li className="list-none flex justify-between">
                        <span>Market impact</span>
                        <span className="text-primary-text">
                            <span className="mr-0.5">$</span>
                            <span>{marketImpact}</span>
                        </span>
                    </li>
                    <li className="list-none flex justify-between">
                        <span>Bridge expenses</span>
                        <span className="text-primary-text">
                            <span className="mr-0.5">-$</span>
                            <span>{bridgeExpenses}</span>
                        </span>
                    </li>
                    <li className="list-none flex justify-between">
                        <span>Layerswap fees</span>
                        <span className="text-primary-text">
                            <span className="mr-0.5">-$</span>
                            <span>{serviceFee}</span>
                        </span>
                    </li>
                </ul>
            </TooltipContent>
        </Tooltip>
    </>)
}