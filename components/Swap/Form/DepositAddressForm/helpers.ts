import { DepositAction } from "@/lib/apiClients/layerSwapApiClient";
import { DetailedQuoteModel } from "@/hooks/useDetailedQuote";
import { formatPercent } from "@/components/utils/formatPercent";
import { formatUsd } from "@/components/utils/formatUsdAmount";

export function formatCompletionTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `~${hours}h`;
    if (minutes > 0) return `~${minutes} min`;
    return `~${seconds}s`;
}

export function formatFee(percentageFee: number, fixedFeeUsd: number): string {
    const parts: string[] = [];
    const pct = formatPercent(percentageFee);
    if (pct) parts.push(pct);
    if (fixedFeeUsd > 0) parts.push(formatUsd(fixedFeeUsd));
    return parts.join(' + ') || 'Free';
}

export function formatTokenAmount(value: number): string {
    if (!Number.isFinite(value)) return '';
    if (value === 0) return '0';
    let maximumFractionDigits: number;
    if (value >= 1000) maximumFractionDigits = 0;
    else if (value >= 10) maximumFractionDigits = 2;
    else if (value >= 1) maximumFractionDigits = 4;
    else maximumFractionDigits = 6;
    return value.toLocaleString('en-US', { maximumFractionDigits });
}

export function formatTierRange(tier: DetailedQuoteModel, isFirst: boolean, isLast: boolean, symbol: string): string {
    const min = formatTokenAmount(tier.min_amount);
    const max = formatTokenAmount(tier.max_amount);
    if (isFirst) return `Up to ${max} ${symbol}`;
    if (isLast) return `Over ${min} ${symbol}`;
    return `${min} – ${max} ${symbol}`;
}

export function resolveDepositAddress(
    network: { type?: string } | undefined,
    depositActions: DepositAction[] | undefined
): string | undefined {
    if (!depositActions || depositActions.length === 0) return undefined;
    if (!network) return depositActions[0].to_address;
    const match = depositActions.find(a => a.network?.type === network.type);
    return match?.to_address ?? depositActions[0].to_address;
}
