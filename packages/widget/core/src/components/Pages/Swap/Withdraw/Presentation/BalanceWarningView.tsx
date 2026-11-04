import InfoIcon from '@/components/Icons/InfoIcon';
import type { ReactNode } from 'react';
import { ErrorDisplay } from '../../Form/SecondaryComponents/validationError/ErrorDisplay';
import { ICON_CLASSES_WARNING } from '../../Form/SecondaryComponents/validationError/constants';

export function BalanceWarningView({
    amount,
    asset,
    requiredAmount,
    network,
    refreshing,
    refreshButton,
}: {
    amount?: string | number;
    asset?: string;
    requiredAmount?: string | number;
    network?: string;
    refreshing?: boolean;
    refreshButton: ReactNode;
}) {
    return (
        <div role="status" className="rounded-2xl bg-secondary-400 p-4">
            <div className="flex items-center gap-2">
                <span aria-hidden="true" className="shrink-0">
                    <InfoIcon className={ICON_CLASSES_WARNING} />
                </span>
                <p className="text-base font-medium leading-5 text-primary-text">
                    Insufficient balance
                </p>
            </div>
            <div className="mt-4 min-w-0">
                {amount !== undefined && asset && (
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                        <div className="min-w-0">
                            <dt className="text-xs leading-4 text-secondary-text">Your balance</dt>
                            <dd className={`mt-1 break-words text-sm font-medium leading-5 tabular-nums text-primary-text ${refreshing ? 'animate-pulse' : ''}`}>
                                {amount} {asset}
                            </dd>
                        </div>
                        {requiredAmount !== undefined && (
                            <div className="min-w-0 border-l border-secondary-300 pl-4">
                                <dt className="text-xs leading-4 text-secondary-text">Swap amount</dt>
                                <dd className="mt-1 break-words text-sm font-medium leading-5 tabular-nums text-primary-text">
                                    {requiredAmount} {asset}
                                </dd>
                            </div>
                        )}
                    </dl>
                )}
                <p className="mt-3 text-xs leading-4.5 text-secondary-text">
                    Add more {asset || 'funds'}{network ? ` on ${network}` : ''} to continue.
                </p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 [&>button]:flex-1">
                {refreshButton}
            </div>
        </div>
    );
}

export function GasWarningView({ adjustButton }: { adjustButton: ReactNode }) {
    return (
        <ErrorDisplay
            icon={<InfoIcon className="w-5 h-5 text-secondary-text" />}
            title="Insufficient balance for gas"
            message="You need a small balance remaining to pay for gas."
            action={adjustButton}
        />
    );
}
