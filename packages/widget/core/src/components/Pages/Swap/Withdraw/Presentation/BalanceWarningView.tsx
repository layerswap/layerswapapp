import InfoIcon from '@/components/Icons/InfoIcon';
import type { ReactNode } from 'react';
import { ErrorDisplay } from '../../Form/SecondaryComponents/validationError/ErrorDisplay';
import { ICON_CLASSES_WARNING } from '../../Form/SecondaryComponents/validationError/constants';

export function BalanceWarningView({
    amount,
    asset,
    refreshing,
    refreshButton,
}: {
    amount?: string | number;
    asset?: string;
    refreshing?: boolean;
    refreshButton: ReactNode;
}) {
    return (
        <ErrorDisplay
            icon={<InfoIcon className={ICON_CLASSES_WARNING} />}
            title={
                <>
                    <span>Insufficient balance</span>
                    {amount !== undefined && asset && (
                        <span
                            className={`font-normal text-sm ${refreshing ? 'animate-shine bg-[linear-gradient(90deg,var(--color-secondary-text)_40%,white_50%,var(--color-secondary-text)_60%)] bg-size-[200%_100%] bg-clip-text text-transparent' : 'text-secondary-text'}`}
                        >
                            {' '}
                            ({amount} {asset})
                        </span>
                    )}
                </>
            }
            message="If you recently added funds, refresh the balance or check your connected wallet"
            footer={refreshButton}
        />
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
