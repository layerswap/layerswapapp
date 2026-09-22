import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/shadcn/accordion';
import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
export function QuoteView({
    isOpen,
    setIsOpen,
    summary,
    details,
    animate = true,
    compact = false,
}: {
    isOpen: boolean;
    setIsOpen?: (open: boolean) => void;
    summary: ReactNode;
    details: ReactNode;
    animate?: boolean;
    compact?: boolean;
}) {
    if (compact) return <div className="w-full rounded-2xl bg-secondary-500">{summary}</div>;
    return (
        <Accordion
            type="single"
            collapsible
            className="w-full"
            value={isOpen ? 'quote' : ''}
            onValueChange={(v) => setIsOpen?.(v === 'quote')}
        >
            <AccordionItem
                value="quote"
                className="bg-secondary-500 rounded-2xl"
            >
                <AccordionTrigger
                    as="div"
                    onClick={(e) => e.preventDefault()}
                    className="w-full rounded-2xl flex items-center justify-between cursor-auto"
                >
                    {summary}
                </AccordionTrigger>

                <AccordionContent className="rounded-2xl" animate={animate}>
                    {details}
                </AccordionContent>

                {isOpen && (
                    <div className="px-3.5 pb-3">
                        <button
                            type="button"
                            data-page2-quote-disclosure
                            aria-expanded={isOpen}
                            onClick={() => setIsOpen?.(false)}
                            className="mx-auto flex items-center justify-center gap-1 text-sm text-secondary-text hover:text-primary-text"
                        >
                            <span>Close details</span>
                            <ChevronDown className="h-3.5 w-3.5 rotate-180 transition-transform" />
                        </button>
                    </div>
                )}
            </AccordionItem>
        </Accordion>
    );
}
