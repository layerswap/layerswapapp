import AlertIcon from '@/components/Icons/AlertIcon';
import type { FC } from 'react';
export interface QuoteUpdatedProps {
    isBelowMin?: boolean;
    minAllowedAmount: number | undefined;
    maxAllowedAmount: number | undefined;
    network: string | undefined;
    token: string | undefined;
}

export const QuoteUpdated: FC<QuoteUpdatedProps> = (props) => {
    return (
        <div>
            <div className="p-3 bg-secondary-500 rounded-lg mb-3 w-fit mx-auto">
                <AlertIcon className="h-11 w-11" />
            </div>

            {/* Header */}
            <h2 className="text-primary-text text-xl font-medium text-center mb-3">
                <span>{props.isBelowMin ? 'Minimum' : 'Maximum'}</span>{' '}
                <span>Amount Adjusted</span>
            </h2>

            {/* Description */}
            <p className="text-center text-secondary-text text-base mb-6">
                <span>The </span>
                <span>{props.isBelowMin ? 'minimum' : 'maximum'}</span>
                <span> amount you can send using </span>
                <span>{props.network}</span>
                <span> is </span>
                <span>
                    {props.isBelowMin
                        ? props?.minAllowedAmount
                        : props?.maxAllowedAmount}
                </span>
                <span>
                    {' '}
                    {props.token}. We’ll adjust your transfer to this limit to
                    proceed.
                </span>
            </p>
        </div>
    );
};
