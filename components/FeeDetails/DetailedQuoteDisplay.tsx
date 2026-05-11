import { FC, useMemo } from "react";
import { DetailedQuoteModel } from "@/hooks/useDetailedQuote";
import { NetworkRouteToken } from "@/Models/Network";
import clsx from "clsx";
import { Clock, Zap } from "lucide-react";
import { formatUsd } from "@/components/utils/formatUsdAmount";

type Props = {
    quotes: DetailedQuoteModel[] | undefined;
    isLoading: boolean;
    sourceToken: NetworkRouteToken | undefined;
    destinationToken: NetworkRouteToken | undefined;
};

function formatCompletionTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `~${hours}h`;
    if (minutes > 0) return `~${minutes} min`;
    return `~${seconds}s`;
}

function formatCompactAmount(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
    if (value >= 1) return value.toFixed(2);
    return value.toPrecision(3);
}

function formatFee(percentageFee: number, fixedFeeUsd: number): string {
    const parts: string[] = [];
    if (percentageFee > 0) parts.push(`${percentageFee.toFixed(2)}%`);
    if (fixedFeeUsd > 0) parts.push(formatUsd(fixedFeeUsd));
    return parts.join(' + ') || 'Free';
}

const DetailedQuoteDisplay: FC<Props> = ({ quotes, isLoading, sourceToken }) => {
    const segments = useMemo(() => {
        if (!quotes?.length) return [];
        return [...quotes].sort((a, b) => a.min_amount - b.min_amount);
    }, [quotes]);

    const hasMultiple = segments.length > 1;

    if (!quotes?.length && !isLoading) return null;

    return (
        <div className={clsx(
            "space-y-2",
            { "animate-pulse-stronger": isLoading && !quotes?.length }
        )}>
            {segments.length > 0 && (
                hasMultiple ? (
                    <div className="space-y-1.5">
                        {segments.map((seg, i) => (
                            <div key={i} className="bg-secondary-500 rounded-xl px-3.5 py-2.5 flex items-center justify-between">
                                <div className="text-xs text-secondary-text">
                                    {formatUsd(seg.min_amount_in_usd)} – {formatUsd(seg.max_amount_in_usd)}
                                </div>
                                <div className="flex items-center gap-2.5 text-xs">
                                    <span className="text-primary-text flex items-center gap-1">
                                        <Zap className="h-3 w-3 text-secondary-text" />
                                        {formatFee(seg.total_percentage_fee, seg.total_fixed_fee_in_usd)}
                                    </span>
                                    <span className="text-secondary-text flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatCompletionTime(seg.avg_completion_milliseconds)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-secondary-500 rounded-xl px-3 py-2.5 flex items-center justify-between">
                                <span className="text-xs text-secondary-text">Min</span>
                                <span className="text-sm font-medium text-primary-text">
                                    {formatCompactAmount(segments[0].min_amount)}
                                    {sourceToken && <span className="ml-1 text-secondary-text">{sourceToken.symbol}</span>}
                                </span>
                            </div>
                            <div className="flex-1 bg-secondary-500 rounded-xl px-3 py-2.5 flex items-center justify-between">
                                <span className="text-xs text-secondary-text">Max</span>
                                <span className="text-sm font-medium text-primary-text">
                                    {formatCompactAmount(segments[0].max_amount)}
                                    {sourceToken && <span className="ml-1 text-secondary-text">{sourceToken.symbol}</span>}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-1 text-xs text-secondary-text">
                            <span className="flex items-center gap-1">
                                <Zap className="h-3 w-3" />
                                {formatFee(segments[0].total_percentage_fee, segments[0].total_fixed_fee_in_usd)}{' fee'}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatCompletionTime(segments[0].avg_completion_milliseconds)}
                            </span>
                        </div>
                    </>
                )
            )}
        </div>
    );
};

export default DetailedQuoteDisplay;
