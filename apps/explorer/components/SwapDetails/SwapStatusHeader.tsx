"use client";

import StatusIcon from "../SwapHistory/StatusIcons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../shadcn/tooltip";
import { getTimeDifferenceFromNow } from "../utils/CalcTime";
import { SwapStatus } from "@/models/SwapStatus";
import { Transaction } from "@/models/Swap";

interface SwapStatusHeaderProps {
    status: SwapStatus;
    inputTransaction: Transaction;
    outputTransaction?: Transaction;
    createdDate: string;
    totalFee?: number;
    sourceTokenSymbol?: string;
    sourceTokenPrecision?: number;
}

const dateOptionsWithYear = {
    year: 'numeric' as const,
    month: 'short' as const,
    day: 'numeric' as const,
    hour: 'numeric' as const,
    minute: 'numeric' as const,
};

const dateOptionsWithoutYear = {
    month: 'short' as const,
    day: 'numeric' as const,
    hour: 'numeric' as const,
    minute: 'numeric' as const,
};

function truncateDecimals(value: number | undefined, decimals: number | undefined) {
    if (value === undefined || decimals === undefined) return value;
    const truncated = Number(value.toFixed(decimals));
    if (truncated.toString().includes('e')) {
        return truncated.toFixed(decimals);
    }
    return truncated;
}

export default function SwapStatusHeader({
    status,
    inputTransaction,
    outputTransaction,
    createdDate,
    totalFee,
    sourceTokenSymbol,
    sourceTokenPrecision,
}: SwapStatusHeaderProps) {
    const currentYear = new Date().getFullYear();
    const isCurrentYear = new Date(inputTransaction.timestamp || '').getFullYear() === currentYear;
    const dateOptions = isCurrentYear ? dateOptionsWithoutYear : dateOptionsWithYear;

    const DateDisplay = () => (
        <TooltipProvider delayDuration={0}>
            <Tooltip>
                <TooltipTrigger className="cursor-default">
                    {new Date(inputTransaction.timestamp).toLocaleString('en-US', dateOptions)}
                </TooltipTrigger>
                <TooltipContent>
                    {new Date(createdDate).toUTCString()}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );

    return (
        <div className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-2 mb-4 text-base md:text-xl">
            <StatusIcon swap={status} />
            <span className="text-secondary-300 mx-1 hidden lg:block">|</span>
            <div className="gap-1 flex flex-row items-center">
                <p className="whitespace-nowrap text-primary-text-tertiary">Date:</p>
                <div className="whitespace-nowrap text-primary-text"><DateDisplay /></div>
            </div>
            <span className="text-secondary-300 mx-1 hidden lg:block">|</span>
            <div className=" gap-1 flex flex-row items-center text-primary-text">
                <p className="whitespace-nowrap text-primary-text-tertiary">Duration:</p>
                {outputTransaction ? (
                    <p>
                        {getTimeDifferenceFromNow(inputTransaction.timestamp, outputTransaction.timestamp)}
                    </p>
                )
                    : (
                        <p>
                            {getTimeDifferenceFromNow(inputTransaction.timestamp, new Date().toString())} ago
                        </p>
                    )}
            </div>
            {
                totalFee && (
                    <>
                        <span className="text-secondary-300 mx-1 hidden lg:block">|</span>
                        <div className="gap-1 flex flex-row items-center">
                            <p className="text-primary-text-tertiary">Cost:</p>
                            <p className="text-primary-text">
                                {truncateDecimals(totalFee, sourceTokenPrecision)} {sourceTokenSymbol}
                            </p>
                        </div>
                    </>
                )
            }
        </div>
    );
}
