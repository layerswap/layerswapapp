import type { ReactNode } from 'react';
import { ChevronDown, CircleHelp, Clock } from 'lucide-react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/shadcn/accordion';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/shadcn/tooltip';

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

export function DepositQuoteDetailsView({
    showQuoteSkeleton,
    hasQuotes,
    isOpen,
    onOpenChange,
    minDepositDisplay,
    maxDepositDisplay,
    feeDisplay,
    estTime,
    onOpenCalculator,
    calculator,
}: {
    showQuoteSkeleton?: boolean;
    hasQuotes: boolean;
    isOpen: boolean;
    onOpenChange?: (open: boolean) => void;
    minDepositDisplay?: string | null;
    maxDepositDisplay?: string | null;
    feeDisplay?: string | null;
    estTime?: string | null;
    onOpenCalculator?: () => void;
    calculator?: ReactNode;
}) {
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

    if (!hasQuotes) return null;

    return (
        <>
            <Accordion
                type="single"
                collapsible
                className="w-full"
                value={isOpen ? 'quote' : ''}
                onValueChange={(value) => onOpenChange?.(value === 'quote')}
            >
                <AccordionItem
                    value="quote"
                    className="bg-secondary-500 rounded-2xl"
                >
                    <AccordionTrigger
                        data-attr="see-deposit-details"
                        data-page2-quote-disclosure
                        className="w-full rounded-2xl flex items-center justify-between"
                    >
                        {isOpen ? (
                            <div className="flex items-center w-full justify-between px-4 py-3.5 text-sm">
                                <span className="text-primary-text">
                                    Details
                                </span>
                                <ChevronDown className="h-3.5 w-3.5 text-secondary-text rotate-180 transition-transform" />
                            </div>
                        ) : (
                            <div className="flex items-center w-full justify-between gap-2 px-4 py-3.5 text-sm">
                                <div className="flex items-center gap-1 space-x-3 min-w-0">
                                    <div className="inline-flex items-center gap-1.5 min-w-0">
                                        <span className="text-secondary-text shrink-0">
                                            Min
                                        </span>
                                        {minDepositDisplay && (
                                            <span className="text-primary-text truncate">
                                                {minDepositDisplay}
                                            </span>
                                        )}
                                    </div>
                                    {estTime && (
                                        <div className="w-px h-3 bg-primary-text-tertiary rounded-2xl shrink-0" />
                                    )}
                                    {estTime && (
                                        <div className="inline-flex items-center gap-1 shrink-0">
                                            <div className="p-0.5">
                                                <Clock className="h-4 w-4 text-secondary-text" />
                                            </div>
                                            <span className="text-primary-text">
                                                {estTime}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <ChevronDown className="h-3.5 w-3.5 text-secondary-text shrink-0" />
                            </div>
                        )}
                    </AccordionTrigger>

                    <AccordionContent className="rounded-2xl">
                        <div className="flex flex-col px-2 pb-1">
                            {minDepositDisplay && (
                                <RowWrapper title="Minimum">
                                    {minDepositDisplay}
                                </RowWrapper>
                            )}
                            {maxDepositDisplay && (
                                <RowWrapper title="Maximum">
                                    {maxDepositDisplay}
                                </RowWrapper>
                            )}
                            {feeDisplay && (
                                <RowWrapper
                                    title="Fees"
                                    action={
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button
                                                    type="button"
                                                    onClick={onOpenCalculator}
                                                    aria-label="Open fee calculator"
                                                    className="inline-flex items-center text-secondary-text hover:text-primary-text transition-colors"
                                                >
                                                    <CircleHelp className="h-4 w-4" />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-secondary-300! border-secondary-300! text-primary-text!">
                                                <span>
                                                    Click to open the fee
                                                    calculator
                                                </span>
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
            {calculator}
        </>
    );
}
