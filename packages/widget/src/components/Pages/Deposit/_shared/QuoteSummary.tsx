import { FC } from "react";
import { ImageWithFallback } from "@/components/Common/ImageWithFallback";
import { NetworkRouteToken } from "@/Models/Network";
import { formatTokenAmount } from "@/components/utils/formatTokenAmount";
import { formatUsd } from "@/components/utils/formatUsdAmount";
import { useUsdModeStore } from "@/stores/usdModeStore";

type Props = {
    receiveAmount?: number;
    receiveAmountInUsd?: number;
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
    receiveAmountInUsd,
    tokenSymbol,
    token,
    isLoading,
}) => {
    const isUsdMode = useUsdModeStore(s => s.isUsdMode);
    const hasReceive =
        receiveAmount != null && Number.isFinite(receiveAmount) && tokenSymbol;

    const hasUsd = receiveAmountInUsd != null && Number.isFinite(receiveAmountInUsd);

    // Mirror the amount field's USD toggle: show the received value in USD when
    // it's available, otherwise fall back to the token amount.
    const showUsd = isUsdMode && hasUsd;

    const primary = showUsd
        ? formatUsd(receiveAmountInUsd as number)
        : formatTokenAmount(receiveAmount as number);

    // Secondary line shows the counterpart value, like the "Send from" card.
    const secondary = showUsd
        ? `${formatTokenAmount(receiveAmount as number)} ${tokenSymbol}`
        : hasUsd
            ? formatUsd(receiveAmountInUsd as number)
            : undefined;

    if (isLoading) {
        return (
            <div className="w-full bg-secondary-500 rounded-2xl p-4 flex flex-col gap-1.5">
                <Bar className="h-3.5 w-20" />
                <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col gap-1">
                        <Bar className="h-7 w-32" />
                        <Bar className="h-4 w-20" />
                    </div>
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
            <div className="flex items-center justify-between gap-3 relative z-10">
                <div className="flex flex-col min-w-0 gap-0.5">
                    <span className="tabular-nums text-primary-text font-medium leading-none text-[28px] truncate">
                        {primary}
                    </span>
                    {secondary && (
                        <span className="tabular-nums text-secondary-text text-xs sm:text-base leading-5 font-medium truncate">
                            {secondary}
                        </span>
                    )}
                </div>
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
