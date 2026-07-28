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

    if (status === SwapStatus.Completed && outputTransaction) {
        return (
            <div className="flex flex-col sm:flex-row sm:items-center flex-wrap gap-y-1 mb-4">
                <StatusIcon swap={status} />
                <div className="flex items-center flex-wrap gap-x-2 sm:gap-x-0 gap-y-0.5">
                    <span className="whitespace-nowrap">
                        <span className="text-secondary-300 mx-1 hidden sm:inline">|</span>
                        <span className="text-primary-text-tertiary align-bottom">Date:</span>
                        <span className="text-primary-text align-bottom ml-0.5"><DateDisplay /></span>
                    </span>
                    <span className="whitespace-nowrap">
                        <span className="text-secondary-300 mx-1 hidden sm:inline">|</span>
                        <span className="text-primary-text-tertiary">Duration:</span>
                        <span className="text-primary-text ml-0.5">{getTimeDifferenceFromNow(inputTransaction.timestamp, outputTransaction.timestamp)}</span>
                    </span>
                    <span className="whitespace-nowrap">
                        <span className="text-secondary-300 mx-1 hidden sm:inline">|</span>
                        <span className="text-primary-text-tertiary">Cost:</span>
                        <span className="text-primary-text ml-0.5">{truncateDecimals(totalFee, sourceTokenPrecision)} {sourceTokenSymbol}</span>
                    </span>
                </div>
            </div>
        );
    }

    if (status !== SwapStatus.Completed) {
        return (
            <div className="flex flex-col sm:flex-row sm:items-center flex-wrap gap-y-1">
                <StatusIcon swap={status} />
                <div className="flex items-center flex-wrap">
                    <span className="text-secondary-300 mx-1 hidden sm:inline">|</span>
                    <span className="whitespace-nowrap text-primary-text-tertiary align-bottom">Date:</span>
                    <span className="whitespace-nowrap text-primary-text align-bottom"><DateDisplay /></span>
                    <span className="text-primary-text-tertiary ml-1">({getTimeDifferenceFromNow(inputTransaction.timestamp, new Date().toString())} ago)</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex sm:flex-row">
            <StatusIcon swap={status} />
        </div>
    );
}
