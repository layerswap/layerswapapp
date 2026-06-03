import { FC } from "react";
import { ShieldCheck } from "lucide-react";
import { ImageWithFallback } from "@/components/Common/ImageWithFallback";
import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import { formatTokenAmount } from "@/components/utils/formatTokenAmount";

type Props = {
    receiveAmount?: number;
    tokenSymbol?: string;
    network?: NetworkRoute;
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
    network,
    token,
    isLoading,
}) => {
    const hasReceive =
        receiveAmount != null && Number.isFinite(receiveAmount) && tokenSymbol;

    if (isLoading) {
        return (
            <div className="bg-secondary-500 border border-secondary-400 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                    <Bar className="h-3 w-20" />
                    <Bar className="h-3 w-14" />
                </div>
                <div className="flex items-center justify-between gap-2">
                    <Bar className="h-8 w-36" />
                    <Bar className="h-7 w-24 rounded-full" />
                </div>
                <Bar className="h-3 w-40" />
            </div>
        );
    }

    if (!hasReceive) return null;

    return (
        <div className="relative overflow-hidden bg-secondary-500 ring ring-primary-500/20 rounded-2xl p-4 flex flex-col gap-1.5">
            <span
                aria-hidden
                className="pointer-events-none absolute -top-12 -right-10 h-40 w-40 rounded-full bg-primary-500/15 blur-3xl"
            />
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
