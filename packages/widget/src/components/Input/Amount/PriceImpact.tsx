import { FC, useMemo } from "react";
import { Triangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip";
import clsx from 'clsx';

type PriceImpactProps = {
    receiveAmount?: number;
    requestedAmount?: number;
    sourceTokenPriceUsd?: number;
    destinationTokenPriceUsd?: number;
    serviceFee?: number;
    bridgeFee?: number;
    className?: string;
};

export const PriceImpact: FC<PriceImpactProps> = ({
    receiveAmount,
    requestedAmount,
    sourceTokenPriceUsd,
    destinationTokenPriceUsd,
    serviceFee,
    bridgeFee,
    className,
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
        return (toAmountUSD - fromAmountUSD);
    }, [fromAmountUSD, toAmountUSD]);

    const layerswapFees = useMemo(() => {
        if (serviceFee == null || sourceTokenPriceUsd == null) return undefined;
        return (serviceFee * sourceTokenPriceUsd);
    }, [serviceFee, sourceTokenPriceUsd]);

    const bridgeExpenses = useMemo(() => {
        if (bridgeFee == null || sourceTokenPriceUsd == null) return undefined;
        return (bridgeFee * sourceTokenPriceUsd);
    }, [bridgeFee, sourceTokenPriceUsd]);

    const marketImpact = useMemo(() => {
        if (priceImpact === undefined || layerswapFees === undefined || bridgeExpenses === undefined) return undefined;
        return (priceImpact + Number(layerswapFees) + Number(bridgeExpenses));
    }, [priceImpact, layerswapFees, bridgeExpenses]);

    const priceImpactPercentage = useMemo(() => {
        if (fromAmountUSD === undefined || toAmountUSD === undefined) return undefined;
        return Number((((toAmountUSD - fromAmountUSD) / fromAmountUSD) * 100).toFixed(2));
    }, [fromAmountUSD, toAmountUSD]);

    if (priceImpact === undefined) return null;

    return (<>
        <Tooltip openOnClick>
            <TooltipTrigger asChild>
                <span className={clsx("flex text-secondary-text items-center cursor-default hover:text-primary-text", className)}>
                    <span className="flex items-center gap-0.5">
                        <span>(</span>
                        <Triangle fill="currentColor" className={`w-3.5 h-3.5 stroke-1 fill-current transition-transform ${priceImpact < 0 ? "rotate-180" : ""}`} />
                        <span>
                            ${Math.abs(priceImpact).toFixed(2)}
                        </span>
                        <span>)</span>
                    </span>
                </span>
            </TooltipTrigger>
            <TooltipContent arrowClasses="!bg-secondary-500 !fill-secondary-500" side="top" align="center" className="!bg-secondary-500 !border-secondary-500 !text-secondary-text text-xs font-normal rounded-xl !p-4 shadow-2xl">
                <p className="text-primary-text font-medium text-sm flex items-baseline space-x-0.5 mb-1">
                    <span>Price impact:</span>
                    <span>{formatCurrency(priceImpact)}</span>
                    <span className="text-secondary-text text-xs font-normal">{priceImpactPercentage ? `(${priceImpact < 0 ? "-" : "+"}${Math.abs(priceImpactPercentage)}%)` : ""}</span>
                </p>
                <p>This is the difference in total USD value</p>
                <p>between the assets you send and the assets you receive.</p>
                <ul className="mt-3 space-y-2 ">
                    <li className="list-none flex justify-between">
                        <span>Market impact</span>
                        <span className="text-primary-text">
                            <span>{formatCurrency(marketImpact)}</span>
                        </span>
                    </li>
                    <li className="list-none flex justify-between">
                        <span>Bridge expenses</span>
                        <span className="text-primary-text">
                            <span>
                                {bridgeExpenses?.toFixed(2) !== (0).toFixed(2) ? "-$" : "$"}
                            </span>
                            <span>{Math.abs(Number(bridgeExpenses)).toFixed(2)}</span>
                        </span>
                    </li>
                    <li className="list-none flex justify-between">
                        <span>Layerswap fees</span>
                        <span className="text-primary-text">
                            <span>
                                {layerswapFees?.toFixed(2) !== (0).toFixed(2) ? "-$" : "$"}
                            </span>
                            <span>{Math.abs(Number(layerswapFees)).toFixed(2)}</span>
                        </span>
                    </li>
                </ul>
            </TooltipContent>
        </Tooltip>
    </>)
}

const formatCurrency = (value?: number, decimals: number = 2) => {
    if (value === undefined || isNaN(value)) return "";

    const rounded = Number(value.toFixed(decimals));

    // If rounded value is effectively zero, show "$0.00" (no minus sign)
    // Math.pow(10, -decimals) defines the smallest meaningful value at the precision
    const epsilon = Math.pow(10, -decimals);
    if (Math.abs(rounded) < epsilon) {
        return `$${(0).toFixed(decimals)}`;
    }

    return `${rounded < 0 ? "-$" : "+$"}${Math.abs(rounded).toFixed(decimals)}`;
};
