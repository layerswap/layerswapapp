import { FC, useMemo } from "react";
import { Triangle } from "lucide-react";
import { Tooltip, TooltipArrow, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip";
import { Refuel, SwapQuote } from "@/lib/apiClients/layerSwapApiClient";
import clsx from 'clsx';
import { resolvePriceImpactValues } from "@/lib/fees";

type PriceImpactProps = {
    quote: SwapQuote | undefined;
    className?: string;
    refuel: Refuel | undefined;
};


export const PriceImpact: FC<PriceImpactProps> = ({
    quote,
    refuel,
    className
}) => {
    const priceImpactValues = useMemo(() => quote ? resolvePriceImpactValues(quote, refuel) : undefined, [quote, refuel]);

    if (priceImpactValues === undefined) return null;

    return (<>
        <Tooltip openOnClick>
            <TooltipTrigger asChild>
                <span data-attr="price-impact" className={clsx("flex text-secondary-text items-center cursor-default hover:text-primary-text",
                    className,
                    { "text-warning-foreground hover:text-warning-foreground/80": priceImpactValues.highMarketPriceImpact }
                )}>
                    <span className="flex items-center gap-0.5">
                        <span>(</span>
                        <Triangle className={`w-3 h-3 stroke-1 fill-current transition-transform ${priceImpactValues.priceImpact !== undefined && priceImpactValues.priceImpact < 0 ? "rotate-180" : ""}`} />
                        <span>
                            ${Math.abs(priceImpactValues.priceImpact || 0).toFixed(2)}
                        </span>
                        <span>)</span>
                    </span>
                </span>
            </TooltipTrigger>
            <TooltipContent arrowClasses="!bg-secondary-500 !fill-secondary-500" side="top" align="center" className="bg-secondary-500! border-secondary-500! text-secondary-text! text-xs font-normal rounded-xl p-4! shadow-card">
                <p className={clsx("text-primary-text font-medium text-sm flex items-baseline space-x-0.5 mb-1", { "text-warning-foreground": priceImpactValues.highMarketPriceImpact })}>
                    {priceImpactValues.highMarketPriceImpact ? (priceImpactValues.criticalMarketPriceImpact ? <span>Critical price impact:</span> : <span>High price impact:</span>) : <span>Price impact:</span>}
                    <span>{formatCurrency(priceImpactValues.priceImpact)}</span>
                    <span className={clsx("text-secondary-text text-xs font-normal", { "text-warning-foreground": priceImpactValues.highMarketPriceImpact })}>{priceImpactValues.priceImpactPercentage ? `(${priceImpactValues.priceImpactPercentage < 0 ? "-" : "+"}${Math.abs(priceImpactValues.priceImpactPercentage)}%)` : ""}</span>
                </p>
                <p>This is the difference in total USD value</p>
                <p>between the assets you send and the assets you receive.</p>
                <ul className="mt-3 space-y-2 ">
                    <li className="list-none flex justify-between">
                        <span>Market impact</span>
                        <span className="text-primary-text">
                            <span>{formatCurrency(priceImpactValues.marketImpact)}</span>
                        </span>
                    </li>
                    <li className="list-none flex justify-between">
                        <span>Bridge expenses</span>
                        <span className="text-primary-text">
                            <span>
                                {priceImpactValues.bridgeExpenses?.toFixed(2) !== (0).toFixed(2) ? "-$" : "$"}
                            </span>
                            <span>{Math.abs(Number(priceImpactValues.bridgeExpenses)).toFixed(2)}</span>
                        </span>
                    </li>
                    <li className="list-none flex justify-between">
                        <span>Layerswap fees</span>
                        <span className="text-primary-text">
                            <span>
                                {priceImpactValues.layerswapFees?.toFixed(2) !== (0).toFixed(2) ? "-$" : "$"}
                            </span>
                            <span>{Math.abs(Number(priceImpactValues.layerswapFees)).toFixed(2)}</span>
                        </span>
                    </li>
                    {refuel && <li className="list-none flex justify-between">
                        <span>Refuel</span>
                        <span className="text-primary-text">
                            <span>
                                {refuel?.amount_in_usd?.toFixed(2) !== (0).toFixed(2) ? "-$" : "$"}
                            </span>
                            <span>{Math.abs(Number(refuel?.amount_in_usd)).toFixed(2)}</span>
                        </span>
                    </li>}
                </ul>
                <TooltipArrow className="bg-secondary-500! fill-secondary-500!" />
            </TooltipContent>
        </Tooltip>
    </>)
}

const formatCurrency = (value?: number, decimals: number = 2) => {
    if (value === undefined || isNaN(value)) return "";

    const rounded = Number(value.toFixed(decimals));

    const epsilon = Math.pow(10, -decimals);
    if (Math.abs(rounded) < epsilon) {
        return `$${(0).toFixed(decimals)}`;
    }

    return `${rounded < 0 ? "-$" : "+$"}${Math.abs(rounded).toFixed(decimals)}`;
};
