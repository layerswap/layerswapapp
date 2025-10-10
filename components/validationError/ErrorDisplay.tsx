import { ValidationDetails } from '@/context/validationContext';
import { Info } from 'lucide-react';
import React from 'react';
import { ICON_CLASSES_WARNING } from './constants';

interface ErrorDisplayProps {
    message: string;
    details: ValidationDetails;
}

export const defaultErrors: { [errorName: string]: ErrorDisplayProps } = {
    "insufficientFunds": {
        message: "You don't have enough balance to complete this transaction, this might cause the transaction to fail please try to enter a smaller amount.",
        details: { title: "Insufficient Balance", type: 'warning', icon: <Info className={ICON_CLASSES_WARNING} /> }
    }
}
export const ErrorDisplay: React.FC<Partial<ErrorDisplayProps & { errorName?: string }>> = (props) => {
    const { message, details } = { ...defaultErrors[props?.errorName || ''], ...props };
    return (
        <div className="px-2 py-3 rounded-2xl bg-secondary-400">
            <div className="flex items-start gap-2">
                <span className="shrink-0 p-0.5">{details?.icon}</span>
                <div className="flex flex-col gap-1">
                    <p className="text-white font-medium leading-4 text-base">{details?.title}</p>
                    <p className="text-secondary-text text-sm leading-[18px]">{message}</p>
                </div>
            </div>
        </div>
    );
};