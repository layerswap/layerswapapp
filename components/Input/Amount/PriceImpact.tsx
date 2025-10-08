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
                        <Triangle className={`w-3 h-3 stroke-1 fill-current transition-transform ${priceImpact < 0 ? "rotate-180" : ""}`} />
                        <span>
                            {formatCurrency(Math.abs(priceImpact))}
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
                            {formatCurrency(bridgeExpenses, 2, true)}
                        </span>
                    </li>

                    <li className="list-none flex justify-between">
                        <span>Layerswap fees</span>
                        <span className="text-primary-text">
                            {formatCurrency(layerswapFees, 2, true)}
                        </span>
                    </li>
                </ul>
            </TooltipContent>
        </Tooltip>
    </>)
}

const formatCurrency = (
    value?: number,
    decimals: number = 2,
    alwaysNegative: boolean = false
) => {
    if (value === undefined || isNaN(value)) return "";

    const absValue = Math.abs(value);
    const sign = alwaysNegative ? "-" : value < 0 ? "-" : "";

    // Handle small nonzero values
    if (absValue > 0 && absValue < 0.01) {
        return `${sign}<$0.01`;
    }

    // Handle true zero
    if (Object.is(Number(value.toFixed(decimals)), 0)) {
        return `$${(0).toFixed(decimals)}`;
    }

    return `${sign}$${absValue.toFixed(decimals)}`;
};