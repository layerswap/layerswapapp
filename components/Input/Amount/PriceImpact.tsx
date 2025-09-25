import { FC, useMemo } from "react";
import { Triangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip";

type PriceImpactProps = {
    receiveAmount?: number;
    requestedAmount?: number;
    sourceTokenPriceUsd?: number;
    destinationTokenPriceUsd?: number;
    serviceFee?: number;
    bridgeFee?: number;
};

export const PriceImpact: FC<PriceImpactProps> = ({
    receiveAmount,
    requestedAmount,
    sourceTokenPriceUsd,
    destinationTokenPriceUsd,
    serviceFee,
    bridgeFee,
}) => {
    const toAmountUSD = useMemo(() => {
        if (!receiveAmount || !destinationTokenPriceUsd) return undefined;
        return receiveAmount * destinationTokenPriceUsd;
    }, [receiveAmount, destinationTokenPriceUsd]);

    const fromAmountUSD = useMemo(() => {
        if (!requestedAmount || !sourceTokenPriceUsd) return undefined;
        return requestedAmount * sourceTokenPriceUsd;
    }, [requestedAmount, sourceTokenPriceUsd]);

    const priceImpact = useMemo(() => {
        if (fromAmountUSD === undefined || toAmountUSD === undefined) return undefined;
        return Number((toAmountUSD - fromAmountUSD).toFixed(2));
    }, [fromAmountUSD, toAmountUSD]);

    const layerswapFees = useMemo(() => {
        if (serviceFee == null || sourceTokenPriceUsd == null) return undefined;
        return Math.abs(serviceFee * sourceTokenPriceUsd).toFixed(2);
    }, [serviceFee, sourceTokenPriceUsd]);

    const bridgeExpenses = useMemo(() => {
        if (bridgeFee == null || sourceTokenPriceUsd == null) return undefined;
        return Math.abs(bridgeFee * sourceTokenPriceUsd).toFixed(2);
    }, [bridgeFee, sourceTokenPriceUsd]);

    const marketImpact = useMemo(() => {
        if (priceImpact === undefined || serviceFee === undefined || bridgeExpenses === undefined) return undefined;
        return (priceImpact + Number(serviceFee) + Number(bridgeExpenses)).toFixed(2);
    }, [priceImpact, serviceFee, bridgeExpenses]);

    const priceImpactPercentage = useMemo(() => {
        if (fromAmountUSD === undefined || toAmountUSD === undefined) return undefined;
        return Number((((toAmountUSD - fromAmountUSD) / fromAmountUSD) * 100).toFixed(2));
    }, [fromAmountUSD, toAmountUSD]);

    if (priceImpact === undefined) return null;

    return (<>
        <Tooltip>
            <TooltipTrigger asChild>
                <span className="flex items-center text-sm text-secondary-text cursor-default hover:text-primary-text">
                    <span className="flex items-center gap-0.5">
                        <span>(</span>
                        <Triangle
                            aria-label={priceImpact < 0 ? "Negative price impact" : "Positive price impact"}
                            className={`w-3 h-3 stroke-1 fill-current transition-transform ${priceImpact < 0 ? "rotate-180" : ""
                                }`}
                        />
                        <span>
                            ${Math.abs(priceImpact)}
                        </span>
                        <span>)</span>
                    </span>
                </span>
            </TooltipTrigger>
            <TooltipContent side="top" align="center" className="!bg-secondary-500 !border-secondary-500 !text-secondary-text text-xs font-normal">
                <p className="text-primary-text font-medium text-sm flex items-baseline space-x-0.5 mb-1">
                    <span>Price impact:</span>
                    <span>{priceImpact < 0 ? "-$" : "+$"}</span>
                    <span>{Math.abs(priceImpact)}</span>
                    <span className="text-secondary-text text-xs font-normal">{priceImpactPercentage ? `(${priceImpact < 0 ? "-" : "+"}${Math.abs(priceImpactPercentage)}%)` : ""}</span>
                </p>
                <p>This is the difference between the USD value of</p>
                <p>the token you send and the token you receive.</p>
                <ul className="mt-3 space-y-2 ">
                    <li className="list-none flex justify-between">
                        <span>Market impact</span>
                        <span className="text-primary-text">
                            <span className="mr-0.5">
                                {Number(marketImpact) < 0 ? "-$" : "$"}
                            </span>
                            <span>{Math.abs(Number(marketImpact))}</span>
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
                            <span>{layerswapFees}</span>
                        </span>
                    </li>
                </ul>
            </TooltipContent>
        </Tooltip>
    </>)
}