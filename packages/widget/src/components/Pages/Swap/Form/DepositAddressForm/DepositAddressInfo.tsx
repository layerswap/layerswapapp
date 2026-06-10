import { FC, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { AnimatePresence, motion } from "framer-motion";
import useCopyClipboard from "@/hooks/useCopyClipboard";
import { useDetailedQuote } from "@/hooks/useDetailedQuote";
import { Network, Token } from "@/Models/Network";
import { formatFee, formatTierRange } from "./helpers";
import { formatTokenAmount } from "@/components/utils/formatTokenAmount";
import { formatEtaFromMs } from "@/components/utils/formatTime";

type DepositAddressInfoProps = {
    sourceNetwork: Network | undefined;
    sourceToken: Token | undefined;
    destinationNetwork: Network | undefined;
    destinationToken: Token | undefined;
    destinationAddress: string | undefined;
    refuel: boolean;
    depositAddress: string | undefined;
    isCreatingSwap: boolean;
}

const DepositAddressInfo: FC<DepositAddressInfoProps> = ({
    sourceNetwork,
    sourceToken,
    destinationNetwork,
    destinationToken,
    destinationAddress,
    refuel,
    depositAddress,
    isCreatingSwap,
}) => {
    const [copied, copy] = useCopyClipboard();
    const [isFeesExpanded, setIsFeesExpanded] = useState(false);

    useEffect(() => {
        setIsFeesExpanded(false);
    }, [sourceNetwork?.name, sourceToken?.symbol]);

    const { detailedQuotes, isLoading: isQuoteLoading } = useDetailedQuote({
        sourceNetwork: sourceNetwork?.name,
        sourceToken: sourceToken?.symbol,
        destinationNetwork: destinationNetwork?.name,
        destinationToken: destinationToken?.symbol,
        destinationAddress,
        refuel,
        useDepositAddress: true,
    });

    const sortedTiers = useMemo(() => {
        if (!detailedQuotes) return [];
        return [...detailedQuotes].sort((a, b) => a.min_amount - b.min_amount);
    }, [detailedQuotes]);

    const bestQuote = detailedQuotes?.[0];

    const minDepositDisplay = useMemo(() => {
        const min = sortedTiers[0]?.min_amount;
        if (!min || !sourceToken) return null;
        return `${formatTokenAmount(min)} ${sourceToken.symbol}`;
    }, [sortedTiers, sourceToken]);

    const maxDepositDisplay = useMemo(() => {
        const max = sortedTiers[sortedTiers.length - 1]?.max_amount;
        if (!max || !Number.isFinite(max) || !sourceToken) return null;
        return `${formatTokenAmount(max)} ${sourceToken.symbol}`;
    }, [sortedTiers, sourceToken]);

    const handleCopy = () => {
        if (depositAddress) copy(depositAddress);
    };

    const depositAddressParts = useMemo(() => {
        if (!depositAddress || depositAddress.length <= 8) {
            return { start: depositAddress ?? '', middle: '', end: '' };
        }
        return {
            start: depositAddress.slice(0, 4),
            middle: depositAddress.slice(4, -4),
            end: depositAddress.slice(-4),
        };
    }, [depositAddress]);

    const showQuoteSkeleton = (isCreatingSwap || isQuoteLoading) && !bestQuote;

    return (
        <div className="flex flex-col gap-3 overflow-hidden">
            {/* Deposit address + QR — UNCHANGED per user request */}
            <div>
                <div className="flex items-stretch bg-secondary-500 rounded-xl overflow-hidden">
                    <div className="shrink-0 bg-white p-1.5 flex items-center">
                        {isCreatingSwap || !depositAddress ? (
                            <div className="h-[140px] w-[140px] bg-secondary-100 rounded animate-pulse" />
                        ) : (
                            <QRCodeSVG
                                className="rounded"
                                value={depositAddress}
                                includeMargin={false}
                                size={140}
                                level="H"
                                imageSettings={sourceNetwork?.logo ? {
                                    src: sourceNetwork.logo,
                                    height: 30,
                                    width: 30,
                                    excavate: true,
                                } : undefined}
                            />
                        )}
                    </div>
                    <div className="flex-1 min-w-0 p-3.5 flex items-center justify-center">
                        {isCreatingSwap || !depositAddress ? (
                            <span className="inline-block bg-secondary-300 h-6 rounded animate-pulse w-32" />
                        ) : (
                            <button
                                type="button"
                                onClick={handleCopy}
                                aria-label={copied ? 'Copied' : 'Copy deposit address'}
                                className="group/copy cursor-pointer text-left"
                                style={{ maxWidth: `${Math.ceil(depositAddress.length / 3) + 2}ch` }}
                            >
                                <span className={`font-mono text-lg leading-snug block break-all transition-colors ${copied ? 'text-primary-text' : 'text-secondary-text group-hover/copy:text-primary-text'}`}>
                                    <span className="text-primary-text font-medium">{depositAddressParts.start}</span>
                                    {depositAddressParts.middle}
                                    <span className="whitespace-nowrap">
                                        <span className="text-primary-text font-medium">{depositAddressParts.end}</span>
                                        <span className="inline-flex items-center align-middle ml-1 w-4 h-4 relative">
                                            <AnimatePresence mode="wait" initial={false}>
                                                {copied ? (
                                                    <motion.span
                                                        key="check"
                                                        initial={{ scale: 0.6, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        exit={{ scale: 0.6, opacity: 0 }}
                                                        transition={{ duration: 0.15 }}
                                                        className="absolute inset-0 inline-flex items-center justify-center"
                                                    >
                                                        <Check className="h-4 w-4 text-secondary-text group-hover/copy:text-primary-text transition-colors" />
                                                    </motion.span>
                                                ) : (
                                                    <motion.span
                                                        key="copy"
                                                        initial={{ scale: 0.6, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        exit={{ scale: 0.6, opacity: 0 }}
                                                        transition={{ duration: 0.15 }}
                                                        className="absolute inset-0 inline-flex items-center justify-center"
                                                    >
                                                        <Copy className="h-4 w-4 text-secondary-text group-hover/copy:text-primary-text transition-colors" />
                                                    </motion.span>
                                                )}
                                            </AnimatePresence>
                                        </span>
                                    </span>
                                </span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Min/Max skeleton */}
            {showQuoteSkeleton && (
                <div className="bg-secondary-500 rounded-xl px-3.5 py-3">
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                            <span className="h-3 w-16 bg-secondary-400 rounded animate-pulse" />
                            <span className="h-3 w-20 bg-secondary-400 rounded animate-pulse" />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="h-3 w-16 bg-secondary-400 rounded animate-pulse" />
                            <span className="h-3 w-20 bg-secondary-400 rounded animate-pulse" />
                        </div>
                    </div>
                </div>
            )}

            {/* Fees skeleton */}
            {showQuoteSkeleton && (
                <div className="bg-secondary-500 rounded-xl px-3.5 py-3">
                    <div className="flex items-start justify-between gap-3">
                        <span className="h-3 w-10 bg-secondary-400 rounded animate-pulse" />
                        <div className="flex flex-col items-end gap-1.5">
                            <span className="h-3 w-28 bg-secondary-400 rounded animate-pulse" />
                            <span className="h-3 w-32 bg-secondary-400 rounded animate-pulse" />
                        </div>
                    </div>
                </div>
            )}

            {/* Min/Max container */}
            {!(isQuoteLoading && !bestQuote) && (minDepositDisplay || maxDepositDisplay) && (
                <div className="bg-secondary-500 rounded-xl px-3.5 py-3">
                    <div className="flex flex-col gap-1.5 text-xs text-secondary-text">
                        {minDepositDisplay && (
                            <div className="flex items-center justify-between">
                                <span>Minimum</span>
                                <span className="text-primary-text">{minDepositDisplay}</span>
                            </div>
                        )}
                        {maxDepositDisplay && (
                            <div className="flex items-center justify-between">
                                <span>Maximum</span>
                                <span className="text-primary-text">{maxDepositDisplay}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Fees + Est. time container */}
            {!(isQuoteLoading && !bestQuote) && sortedTiers.length >= 1 && (
                <div className="bg-secondary-500 rounded-xl px-3.5 py-3">
                    {isFeesExpanded && sortedTiers.length > 1 && sourceToken ? (
                        <div className="flex flex-col gap-2 text-xs">
                            <div className="flex items-center justify-between text-secondary-text">
                                <span>{"Fees by amount"}</span>
                                <button
                                    type="button"
                                    onClick={() => setIsFeesExpanded(false)}
                                    className="inline-flex items-center hover:text-primary-text transition-colors"
                                    aria-label="Hide fee tiers"
                                >
                                    <ChevronUp className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="flex flex-col gap-0.5 border-t border-secondary-400/40 pt-2">
                                {sortedTiers.map((tier, idx) => {
                                    const range = formatTierRange(
                                        tier,
                                        idx === 0,
                                        idx === sortedTiers.length - 1,
                                        sourceToken.symbol
                                    );
                                    const fee = formatFee(tier.total_percentage_fee, tier.total_fixed_fee_in_usd);
                                    return (
                                        <div
                                            key={`${tier.min_amount}-${tier.max_amount}`}
                                            className="flex items-center justify-between gap-4 text-xs"
                                        >
                                            <span className="text-secondary-text">{range}</span>
                                            <span className="flex items-center gap-3">
                                                <span className="text-primary-text">{fee}</span>
                                                <span className="tabular-nums min-w-14 text-right text-secondary-text/80">
                                                    {formatEtaFromMs(tier.avg_completion_milliseconds)}
                                                </span>
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-start justify-between gap-3 text-xs">
                            <span className="text-secondary-text shrink-0">Fees</span>
                            <div className="flex flex-col items-end gap-1 min-w-0">
                                <span className="flex items-center gap-1 min-w-0">
                                    <span className="text-primary-text">{formatFee(sortedTiers[0].total_percentage_fee, sortedTiers[0].total_fixed_fee_in_usd)}</span>
                                    {sortedTiers.length > 1 && sourceToken && (
                                        <span className="text-secondary-text truncate">{`· ${formatTierRange(sortedTiers[0], true, false, sourceToken.symbol)}`}</span>
                                    )}
                                </span>
                                {sortedTiers.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => setIsFeesExpanded(true)}
                                        className="flex items-center gap-1 text-secondary-text hover:text-primary-text transition-colors"
                                        aria-label="Show fee for larger sends"
                                    >
                                        <span>{`${formatFee(sortedTiers[1].total_percentage_fee, sortedTiers[1].total_fixed_fee_in_usd)} for larger sends`}</span>
                                        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DepositAddressInfo;
