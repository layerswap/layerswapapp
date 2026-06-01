import { FC } from "react";
import { formatTokenAmount } from "@/components/utils/formatTokenAmount";
import { formatUsd } from "@/components/utils/formatUsdAmount";

type Props = {
    receiveAmount?: number;
    tokenSymbol?: string;
    minUsd?: number;
    maxUsd?: number;
    isLoading?: boolean;
};

const Placeholder: FC<{ className?: string }> = ({ className }) => (
    <span className={`inline-block h-4 w-20 rounded bg-secondary-400 animate-pulse align-middle ${className || ''}`} />
);

const QuoteSummary: FC<Props> = ({ receiveAmount, tokenSymbol, minUsd, maxUsd, isLoading }) => {
    const hasReceive = receiveAmount != null && Number.isFinite(receiveAmount) && tokenSymbol;

    return (
        <div className="bg-secondary-500 rounded-2xl p-4 flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2 h-5">
                <span className="text-secondary-text text-sm">You receive</span>
                {isLoading ? (
                    <Placeholder className="h-5 w-24" />
                ) : (
                    <span className="tabular-nums text-primary-text text-base font-medium">
                        {hasReceive ? `~${formatTokenAmount(receiveAmount)} ${tokenSymbol}` : "—"}
                    </span>
                )}
            </div>
        </div>
    );
};

export default QuoteSummary;
