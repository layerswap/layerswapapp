import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/shadcn/accordion';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
export function ManualQuoteView({
    available,
    isAccordionOpen,
    setIsAccordionOpen,
    isQuoteLoading,
    triggerClassnames,
    detailsButton,
    details,
    animate = true,
}: {
    available: boolean;
    isAccordionOpen: boolean;
    setIsAccordionOpen?: (open: boolean) => void;
    isQuoteLoading?: boolean;
    triggerClassnames?: string;
    detailsButton: ReactNode;
    details: ReactNode;
    animate?: boolean;
}) {
    return (
        <>
            {available && (
                <Accordion
                    type="single"
                    collapsible
                    className="w-full"
                    value={isAccordionOpen ? 'quote' : ''}
                    onValueChange={(value) => {
                        setIsAccordionOpen?.(value === 'quote');
                    }}
                >
                    <AccordionItem
                        value="quote"
                        className="bg-secondary-500 rounded-2xl"
                    >
                        <AccordionTrigger
                            data-attr="see-swap-details"
                            data-page2-quote-disclosure
                            aria-label={
                                isAccordionOpen
                                    ? 'Close details'
                                    : 'See details'
                            }
                            className={clsx(
                                'p-3.5 pr-5 w-full rounded-2xl flex items-center justify-between transition-colors duration-200 hover:bg-secondary-400',
                                triggerClassnames,
                                {
                                    'bg-secondary-500': !isAccordionOpen,
                                    'bg-secondary-400': isAccordionOpen,
                                    'animate-pulse-strong':
                                        isQuoteLoading && !isAccordionOpen,
                                },
                            )}
                        >
                            {isAccordionOpen ? (
                                <p className="text-sm">Details</p>
                            ) : (
                                detailsButton
                            )}
                            <ChevronDown className="h-3.5 w-3.5 text-secondary-text" />
                        </AccordionTrigger>
                        <AccordionContent
                            className="rounded-2xl"
                            animate={animate}
                        >
                            {details}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            )}
        </>
    );
}
