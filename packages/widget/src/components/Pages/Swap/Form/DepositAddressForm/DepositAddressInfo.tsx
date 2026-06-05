import { FC, useEffect, useMemo, useState } from "react";
import { ChevronDown, Copy, Check, Info, ArrowRight } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import useCopyClipboard from "@/hooks/useCopyClipboard";
import { useDetailedQuote } from "@/hooks/useDetailedQuote";
import { Network, Token } from "@/Models/Network";
import TokenChainBadge from "@/components/Pages/Deposit/_shared/TokenChainBadge";
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
    const hasMultipleTiers = sortedTiers.length > 1 && !!sourceToken;
    const cheapestFee = sortedTiers[0]
        ? formatFee(sortedTiers[0].total_percentage_fee, sortedTiers[0].total_fixed_fee_in_usd)
        : null;

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

            {/* You send → You receive summary */}
            {sourceToken && destinationToken && (
                <div className="bg-secondary-500 rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <TokenChainBadge
                            tokenLogo={sourceToken.logo}
                            tokenSymbol={sourceToken.symbol}
                            networkLogo={sourceNetwork?.logo}
                            networkName={sourceNetwork?.display_name}
                            size={32}
                        />
                        <span className="flex flex-col min-w-0">
                            <span className="text-xs text-secondary-text leading-none">
                                <span>You send</span>
                            </span>
                            <span className="leading-tight truncate mt-1">
                                <span className="text-sm font-semibold text-primary-text">{sourceToken.symbol}</span>
                            </span>
                        </span>
                    </div>

                    <span aria-hidden="true" className="shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-lg bg-secondary-800">
                        <ArrowRight className="h-4 w-4 text-primary" />
                    </span>

                    <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end">
                        <span className="flex flex-col min-w-0 items-end text-right">
                            <span className="text-xs text-secondary-text leading-none">
                                <span>You receive</span>
                            </span>
                            <span className="leading-tight truncate mt-1 w-full text-right">
                                <span className="text-sm font-semibold text-primary-text">{destinationToken.symbol}</span>
                            </span>
                        </span>
                        <TokenChainBadge
                            tokenLogo={destinationToken.logo}
                            tokenSymbol={destinationToken.symbol}
                            networkLogo={destinationNetwork?.logo}
                            networkName={destinationNetwork?.display_name}
                            size={32}
                        />
                    </div>
                </div>
            )}

            {/* Min · Max · Fee meta-row */}
            {showQuoteSkeleton ? (
                <div className="bg-secondary-500 rounded-xl px-3 py-3 flex items-center justify-around gap-2">
                    {[0, 1, 2].map((i) => (
                        <span key={i} className="flex flex-col items-center gap-1.5 animate-pulse">
                            <span className="h-2.5 w-12 bg-secondary-400 rounded" />
                            <span className="h-3 w-20 bg-secondary-400 rounded" />
                        </span>
                    ))}
                </div>
            ) : (sortedTiers.length >= 1 || minDepositDisplay || maxDepositDisplay) && (
                <>
                    <div className="bg-secondary-500 rounded-xl px-3 py-3 flex items-center justify-around gap-2">
                        {minDepositDisplay && (
                            <>
                                <span className="flex flex-col items-center gap-1">
                                    <span className="text-xs text-primary-text-tertiary">
                                        <span>Minimum</span>
                                    </span>
                                    <span className="text-sm font-semibold text-primary-text whitespace-nowrap">{minDepositDisplay}</span>
                                </span>
                                {(maxDepositDisplay || cheapestFee) && (
                                    <span aria-hidden="true" className="w-px h-7 bg-secondary-text/30 rounded-full shrink-0" />
                                )}
                            </>
                        )}
                        {maxDepositDisplay && (
                            <>
                                <span className="flex flex-col items-center gap-1">
                                    <span className="text-xs text-primary-text-tertiary">
                                        <span>Maximum</span>
                                    </span>
                                    <span className="text-sm font-semibold text-primary-text whitespace-nowrap">{maxDepositDisplay}</span>
                                </span>
                                {cheapestFee && (
                                    <span aria-hidden="true" className="w-px h-7 bg-secondary-text/30 rounded-full shrink-0" />
                                )}
                            </>
                        )}
                        {cheapestFee && (
                            hasMultipleTiers ? (
                                <button
                                    type="button"
                                    onClick={() => setIsFeesExpanded(v => !v)}
                                    aria-expanded={isFeesExpanded}
                                    aria-label={isFeesExpanded ? 'Hide fee tiers' : 'Show fee tiers'}
                                    className="flex flex-col items-center gap-1 group/fee bg-transparent border-0 p-0 cursor-pointer"
                                >
                                    <span className="inline-flex items-center gap-1 text-xs text-primary-text-tertiary group-hover/fee:text-primary transition-colors">
                                        <span>Fee</span>
                                        <ChevronDown
                                            className={clsx(
                                                "h-3 w-3 transition-transform duration-200",
                                                isFeesExpanded && "rotate-180"
                                            )}
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <span className="text-sm font-semibold text-primary-text whitespace-nowrap">{cheapestFee}</span>
                                </button>
                            ) : (
                                <span className="flex flex-col items-center gap-1">
                                    <span className="text-xs text-primary-text-tertiary">
                                        <span>Fee</span>
                                    </span>
                                    <span className="text-sm font-semibold text-primary-text whitespace-nowrap">{cheapestFee}</span>
                                </span>
                            )
                        )}
                    </div>

                    {/* Fee tier accordion */}
                    <AnimatePresence initial={false}>
                        {isFeesExpanded && hasMultipleTiers && (
                            <motion.div
                                key="fee-tiers"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                style={{ overflow: "hidden" }}
                            >
                                <div className="bg-secondary-500 rounded-xl px-3.5 py-3 flex flex-col gap-2">
                                    {sortedTiers.map((tier, idx) => {
                                        const range = formatTierRange(
                                            tier,
                                            idx === 0,
                                            idx === sortedTiers.length - 1,
                                            sourceToken!.symbol
                                        );
                                        const fee = formatFee(tier.total_percentage_fee, tier.total_fixed_fee_in_usd);
                                        const isActive = idx === 0;
                                        return (
                                            <div
                                                key={`${tier.min_amount}-${tier.max_amount}`}
                                                className={clsx(
                                                    "flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs",
                                                    isActive
                                                        ? "bg-primary/10 border border-primary/30"
                                                        : "bg-secondary-700 border border-transparent"
                                                )}
                                            >
                                                <span className="text-secondary-text">{range}</span>
                                                <span className="flex items-center gap-3">
                                                    <span className={clsx("font-semibold", isActive ? "text-primary-text" : "text-primary-text")}>{fee}</span>
                                                    <span className="tabular-nums min-w-14 text-right text-secondary-text/80">
                                                        {formatEtaFromMs(tier.avg_completion_milliseconds)}
                                                    </span>
                                                </span>
                                            </div>
                                        );
                                    })}
                                    <div className="flex items-center gap-1.5 text-[11px] text-secondary-text pt-1">
                                        <Info className="h-3 w-3 shrink-0" aria-hidden="true" />
                                        <span>Fee is deducted from the amount you send.</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
            )}
        </div>
    );
};

export default DepositAddressInfo;
