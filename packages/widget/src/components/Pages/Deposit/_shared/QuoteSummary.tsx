import { FC } from "react";
import { ImageWithFallback } from "@/components/Common/ImageWithFallback";
import { NetworkRouteToken } from "@/Models/Network";
import { formatTokenAmount } from "@/components/utils/formatTokenAmount";

type Props = {
    receiveAmount?: number;
    tokenSymbol?: string;
    token?: NetworkRouteToken;
    isLoading?: boolean;
};

const Bar: FC<{ className?: string }> = ({ className }) => (
    <span
        className={`block rounded bg-secondary-400 animate-pulse ${className || ""}`}
    />
);

const QuoteSummary: FC<Props> = ({
    receiveAmount,
    tokenSymbol,
    token,
    isLoading,
}) => {
    const hasReceive =
        receiveAmount != null && Number.isFinite(receiveAmount) && tokenSymbol;

    if (isLoading) {
        return (
            <div className="w-full bg-secondary-500 rounded-2xl p-4 flex flex-col gap-1.5 h-[86.5px]">
                <Bar className="h-3.5 w-20" />
                <div className="flex items-baseline justify-between gap-3">
                    <Bar className="h-7 w-32" />
                    <Bar className="h-7 w-24 rounded-full" />
                </div>
            </div>
        );
    }

    if (!hasReceive) return null;

    return (
        <div className="relative w-full overflow-hidden bg-secondary-500 rounded-2xl p-4 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-secondary-text text-sm relative z-10">
                <span>You receive</span>
            </div>
            <div className="flex items-baseline justify-between gap-3 relative z-10">
                <span className="tabular-nums text-primary-text font-medium leading-none text-[28px] truncate">
                    {formatTokenAmount(receiveAmount as number)}
                </span>
                <span className="shrink-0 inline-flex items-center gap-1.5 bg-secondary-300 rounded-full pr-2 pl-1 py-1">
                    {token?.logo && (
                        <ImageWithFallback
                            src={token.logo}
                            alt={`${tokenSymbol} logo`}
                            height="20"
                            width="20"
                            loading="eager"
                            fetchPriority="high"
                            className="h-5 w-5 rounded-full object-contain"
                        />
                    )}
                    <span className="text-primary-text text-[13px] font-semibold">
                        {tokenSymbol}
                    </span>
                </span>
            </div>
        </div>
    );
};

export default QuoteSummary;
