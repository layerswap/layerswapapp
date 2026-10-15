import { swapFlowTransition } from './swapFlowAnimation';
import { motion } from 'framer-motion';
import { useHydratedReducedMotion } from '@/hooks/useHydratedReducedMotion';
import NumFlowWithFallback from '@/components/Common/NumFlowWithFallback';
import {
    RecipientAddressView,
    type RecipientPresentation,
} from '@/components/Common/RecipientAddressView';
import type { Quote } from '@/lib/apiClients/layerSwapApiClient';
import { Address } from '@/lib/address/Address';
import { ChevronDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { SwapValues } from '../../Form/FeeDetails';
export function QuoteSummaryView({
    quoteData,
    values,
    isOpen,
    onOpen,
    sourceAddress,
    showDestinationAddress,
    destinationContent,
    recipient,
    slippage,
    gasFee,
    detailsButton,
    compact = false,
}: {
    quoteData: Quote;
    values: SwapValues;
    isOpen?: boolean;
    onOpen?: () => void;
    sourceAddress?: string;
    showDestinationAddress: boolean;
    destinationContent?: ReactNode;
    recipient?: RecipientPresentation;
    slippage: ReactNode;
    gasFee: ReactNode;
    detailsButton: ReactNode;
    compact?: boolean;
}) {
    const reducedMotion = useHydratedReducedMotion();
    const transition = reducedMotion ? { duration: 0 } : swapFlowTransition;
    // Preserve the full summary's contents while its grid collapses. A polling
    // update can reset isOpen at the same time as compact; replacing the gas row
    // with the taller disclosure row would otherwise jump before the collapse.
    const [lastExpanded, setLastExpanded] = useState(isOpen);
    if (!compact && lastExpanded !== isOpen) setLastExpanded(isOpen);
    const summaryOpen = compact ? lastExpanded : isOpen;

    return (
        <motion.div
            initial={false}
            transition={transition}
            animate={{
                paddingBottom: !compact && isOpen ? '0rem' : '0.5rem',
                marginBottom: !compact && isOpen ? '-0.25rem' : '0rem',
            }}
            className="flex flex-col w-full p-2"
        >
            {showDestinationAddress &&
                values.destination_address &&
                !Address.equals(sourceAddress ?? '', values.destination_address, values.to) && (
                    <div
                        className={`flex items-center w-full justify-between gap-1 text-sm px-2 py-3`}
                    >
                        <div className="inline-flex items-center text-left text-secondary-text gap-1 pr-4">
                            <label>Send to</label>
                        </div>
                        <div className="text-right text-primary-text">
                            <RecipientAddressView
                                address={values.destination_address}
                                network={values.to}
                                {...recipient}
                            >
                                {destinationContent}
                            </RecipientAddressView>
                        </div>
                    </div>
                )}

            <div className="flex items-center w-full justify-between gap-1 text-sm px-2 py-3">
                <div className="inline-flex items-center text-left text-secondary-text">
                    <label>Receive at least</label>
                </div>
                <div className="text-right text-primary-text h-5">
                    {quoteData?.quote?.min_receive_amount !== undefined &&
                        !isNaN(quoteData?.quote?.min_receive_amount) && (
                            <NumFlowWithFallback
                                value={quoteData?.quote?.min_receive_amount}
                                trend={0}
                                format={{
                                    maximumFractionDigits:
                                        quoteData?.quote.destination_token
                                            ?.precision ??
                                        quoteData?.quote.destination_token
                                            ?.decimals ??
                                        2,
                                }}
                                suffix={` ${values?.toAsset?.asset}`}
                            />
                        )}
                </div>
            </div>
            <motion.div
                className="grid"
                initial={false}
                transition={transition}
                animate={{
                    gridTemplateRows: compact ? '0fr' : '1fr',
                    opacity: compact ? 0 : 1,
                }}
                aria-hidden={compact}
                inert={compact}
            >
                <div className="min-h-0 overflow-hidden">
                    {slippage}
                    {summaryOpen && gasFee}
                    <div
                        className={`${summaryOpen ? 'hidden' : ''} flex flex-wrap items-center w-full justify-between gap-2 px-2 py-3`}
                    >
                        {detailsButton}

                        <button
                            data-attr="see-swap-details"
                            data-page2-quote-disclosure
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpen?.();
                            }}
                            className="ml-auto flex shrink-0 items-center text-secondary-text text-sm whitespace-nowrap gap-0.5 hover:text-primary-text"
                            aria-label="See details"
                            aria-expanded={!!summaryOpen}
                        >
                            <span>See details</span>
                            <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
