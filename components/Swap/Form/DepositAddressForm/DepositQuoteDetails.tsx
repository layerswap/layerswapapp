import { FC, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, CircleHelp, Clock } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/shadcn/accordion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip";
import { useDetailedQuote } from "@/hooks/useDetailedQuote";
import { Network, Token } from "@/Models/Network";
import { formatFee } from "./helpers";
import { formatTokenAmount } from "@/components/utils/formatTokenAmount";
import { formatVerboseHms, msToParts } from "@/components/utils/formatTime";
import FeeCalculator from "./FeeCalculator";

type DepositQuoteDetailsProps = {
    sourceNetwork: Network | undefined;
    sourceToken: Token | undefined;
    destinationNetwork: Network | undefined;
    destinationToken: Token | undefined;
    destinationAddress: string | undefined;
    refuel: boolean;
    isCreatingSwap: boolean;
};

type RowWrapperProps = {
    title: string;
    action?: ReactNode;
    children: ReactNode;
};

const RowWrapper = ({ title, action, children }: RowWrapperProps) => (
    <div className="flex items-center w-full justify-between gap-1 py-3 px-2 text-sm">
        <div className="inline-flex items-center text-left text-secondary-text gap-1.5 pr-4">
            <label>{title}</label>
            {action}
        </div>
        <div className="text-right text-primary-text">{children}</div>
    </div>
);

const DepositQuoteDetails: FC<DepositQuoteDetailsProps> = ({
    sourceNetwork,
    sourceToken,
    destinationNetwork,
    destinationToken,
    destinationAddress,
    refuel,
    isCreatingSwap,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showCalculator, setShowCalculator] = useState(false);

    // Reset the expansion state when the source route changes so a fresh
    // collapsed preview is shown instead of a stale open calculator.
    useEffect(() => {
        setIsOpen(false);
        setShowCalculator(false);
    }, [sourceNetwork?.name, sourceToken?.symbol]);

    // Stable handler so the Accordion subtree doesn't re-render on every SWR poll.
    const handleAccordionChange = useCallback((v: string) => {
        const open = v === 'quote';
        setIsOpen(open);
        if (!open) setShowCalculator(false);
    }, []);

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

    // Derive from the sorted tiers so the ETA matches the same tier the
    // Min/Fees displays read from (sortedTiers[0]), regardless of API order.
    const bestQuote = sortedTiers[0];

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

    const feeDisplay = sortedTiers[0]
        ? formatFee(sortedTiers[0].total_percentage_fee, sortedTiers[0].total_fixed_fee_in_usd)
        : null;

    const estTime = bestQuote ? formatVerboseHms(msToParts(bestQuote.avg_completion_milliseconds)) : null;

    const showQuoteSkeleton = (isCreatingSwap || isQuoteLoading) && !bestQuote;

    if (showQuoteSkeleton) {
        return (
            <div className="bg-secondary-500 rounded-2xl px-4 py-3.5">
                <div className="flex items-center justify-between">
                    <span className="h-3.5 w-32 bg-secondary-400 rounded animate-pulse" />
                    <span className="h-3.5 w-16 bg-secondary-400 rounded animate-pulse" />
                </div>
            </div>
        );
    }

    if (!sortedTiers.length) return null;

    return (
        <>
        <Accordion
            type="single"
            collapsible
            className="w-full"
            value={isOpen ? 'quote' : ''}
            onValueChange={handleAccordionChange}
        >
            <AccordionItem value="quote" className="bg-secondary-500 rounded-2xl">
                <AccordionTrigger
                    data-attr="see-deposit-details"
                    className="w-full rounded-2xl flex items-center justify-between"
                >
                    {isOpen ? (
                        <div className="flex items-center w-full justify-between px-4 py-3.5 text-sm">
                            <span className="text-primary-text">Details</span>
                            <ChevronDown className="h-3.5 w-3.5 text-secondary-text rotate-180 transition-transform" />
                        </div>
                    ) : (
                        <div className="flex items-center w-full justify-between gap-2 px-4 py-3.5 text-sm">
                            <div className="flex items-center gap-1 space-x-3 min-w-0">
                                <div className="inline-flex items-center gap-1.5 min-w-0">
                                    <span className="text-secondary-text shrink-0">Min</span>
                                    {minDepositDisplay && <span className="text-primary-text truncate">{minDepositDisplay}</span>}
                                </div>
                                {estTime && <div className="w-px h-3 bg-primary-text-tertiary rounded-2xl shrink-0" />}
                                {estTime && (
                                    <div className="inline-flex items-center gap-1 shrink-0">
                                        <div className="p-0.5">
                                            <Clock className="h-4 w-4 text-secondary-text" />
                                        </div>
                                        <span className="text-primary-text">{estTime}</span>
                                    </div>
                                )}
                            </div>
                            <ChevronDown className="h-3.5 w-3.5 text-secondary-text shrink-0" />
                        </div>
                    )}
                </AccordionTrigger>

                <AccordionContent className="rounded-2xl">
                    <div className="flex flex-col px-2 pb-1">
                        {minDepositDisplay && <RowWrapper title="Minimum">{minDepositDisplay}</RowWrapper>}
                        {maxDepositDisplay && <RowWrapper title="Maximum">{maxDepositDisplay}</RowWrapper>}
                        {feeDisplay && (
                            <RowWrapper
                                title="Fees"
                                action={
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                type="button"
                                                onClick={() => setShowCalculator(true)}
                                                aria-label="Open fee calculator"
                                                className="inline-flex items-center text-secondary-text hover:text-primary-text transition-colors"
                                            >
                                                <CircleHelp className="h-4 w-4" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-secondary-300! border-secondary-300! text-primary-text!">
                                            <span>Click to open the fee calculator</span>
                                        </TooltipContent>
                                    </Tooltip>
                                }
                            >
                                {feeDisplay}
                            </RowWrapper>
                        )}
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
        <FeeCalculator
            show={showCalculator}
            setShow={setShowCalculator}
            sourceNetwork={sourceNetwork}
            sourceToken={sourceToken}
            destinationNetwork={destinationNetwork}
            destinationToken={destinationToken}
            refuel={refuel}
        />
        </>
    );
};

export default DepositQuoteDetails;
