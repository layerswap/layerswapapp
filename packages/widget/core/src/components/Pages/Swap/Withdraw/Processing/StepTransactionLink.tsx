import { Link2 } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/shadcn/tooltip';

export function StepTransactionLink({
    url,
    stepName,
    readOnly,
}: {
    url: string;
    stepName?: string;
    readOnly?: boolean;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <a
                    data-step-transaction
                    aria-label={
                        stepName
                            ? `View transaction: ${stepName}`
                            : 'View transaction'
                    }
                    aria-disabled={readOnly || undefined}
                    href={readOnly ? undefined : url}
                    target={readOnly ? undefined : '_blank'}
                    rel="noopener noreferrer"
                    className="inline-flex h-6 w-8 shrink-0 items-center justify-center rounded-full bg-secondary-400/50 text-secondary-text transition-colors hover:bg-secondary-400 hover:text-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
                >
                    <Link2 className="h-4 w-4" aria-hidden="true" />
                </a>
            </TooltipTrigger>
            <TooltipContent
                side="top"
                sideOffset={8}
                showArrow
                className="rounded-full! border-0! bg-primary-text! text-secondary-800!"
                arrowClasses="bg-primary-text! fill-primary-text!"
            >
                View transaction
            </TooltipContent>
        </Tooltip>
    );
}
