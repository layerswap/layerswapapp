import type { ReactNode } from 'react';
import ResizablePanel from '@/components/Common/ResizablePanel';

export function DepositLayoutView({
    header,
    children,
    footer,
    transitionKey,
}: {
    header: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    /** Tween screen changes; let content within a screen own its own animation. */
    transitionKey: string;
}) {
    return (
        <div className="flex flex-col gap-3 w-full pt-4 max-sm:pb-4">
            {header}
            <div className="h-px w-full bg-secondary-400" />
            <ResizablePanel
                transitionKey={transitionKey}
                className="flex flex-col gap-3"
            >
                {children}
            </ResizablePanel>
            {footer}
        </div>
    );
}
