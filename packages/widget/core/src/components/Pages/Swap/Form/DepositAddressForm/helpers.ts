import { DetailedQuoteModel } from "@/hooks/useDetailedQuote";
import { formatPercent } from "@/components/utils/formatPercent";
import { formatUsd } from "@/components/utils/formatUsdAmount";
import { formatTokenAmount } from "@/components/utils/formatTokenAmount";

export function formatFee(percentageFee: number, fixedFeeUsd: number): string {
    const parts: string[] = [];
    const pct = formatPercent(percentageFee);
    if (pct) parts.push(pct);
    if (fixedFeeUsd > 0) parts.push(formatUsd(fixedFeeUsd));
    return parts.join(' + ') || 'Free';
}

export function formatTierRange(tier: DetailedQuoteModel, isFirst: boolean, isLast: boolean, symbol: string): string {
    const min = formatTokenAmount(tier.min_amount);
    const max = formatTokenAmount(tier.max_amount);
    if (isFirst) return `Up to ${max} ${symbol}`;
    if (isLast) return `Over ${min} ${symbol}`;
    return `${min} – ${max} ${symbol}`;
}
