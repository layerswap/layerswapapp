import type { ReactNode } from 'react';
import Content from '@/components/Widget/Content';

export function WithdrawContentView({
    summary,
    quote,
    children,
}: {
    summary: ReactNode;
    quote: ReactNode;
    children?: ReactNode;
}) {
    return (
        <Content>
            <div className="w-full flex flex-col justify-between text-secondary-text">
                <div className="grid grid-cols-1 gap-2">
                    {summary}
                    {quote}
                    {children}
                </div>
            </div>
        </Content>
    );
}
export function WalletTransferView({
    warning,
    children,
}: {
    warning?: ReactNode;
    children: ReactNode;
}) {
    return (
        <div className="space-y-2.5">
            {warning}
            {children}
        </div>
    );
}
export function ProcessingSectionView({ children }: { children: ReactNode }) {
    return <div className="space-y-3 w-full h-full">{children}</div>;
}
export function PendingSwapView({
    contained,
    children,
}: {
    contained?: boolean;
    children?: ReactNode;
}) {
    return (
        <div
            className={
                contained
                    ? 'w-full'
                    : 'rounded-lg w-full overflow-hidden relative h-[548px]'
            }
        >
            {children}
        </div>
    );
}

export function WalletSubmissionView({
    message,
    action,
}: {
    message?: ReactNode;
    action?: ReactNode;
}) {
    return (
        <div className="w-full space-y-2 flex flex-col justify-between h-full text-primary-text">
            {message}
            {action}
        </div>
    );
}
