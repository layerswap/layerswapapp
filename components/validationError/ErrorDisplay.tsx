import { ValidationDetails } from '@/context/validationContext';
import { RefreshCw, RouteOff } from 'lucide-react';
import React from 'react';
import { ICON_CLASSES_WARNING } from './constants';
import InfoIcon from "@/components/icons/InfoIcon";

interface ErrorDisplayProps {
    message?: string;
    details: ValidationDetails;
    refreshBalance?: () => void;
    isBalanceLoading?: boolean;
}

export const defaultErrors: { [errorName: string]: ErrorDisplayProps } = {
    "insufficientFunds": {
        details: { title: "Insufficient Balance", type: 'warning', icon: <InfoIcon className={ICON_CLASSES_WARNING} /> },
        message: "If you recently added funds, refresh the balance or check your connected wallet"
    },
    "quoteError": {
        message: "Unable to retrieve quote",
        details: { title: "Unable to retrieve quote", type: 'warning', icon: <RouteOff className={ICON_CLASSES_WARNING} /> }
    }
}
export const ErrorDisplay: React.FC<Partial<ErrorDisplayProps & { errorName?: string }>> = (props) => {
    const { message, details, refreshBalance, isBalanceLoading } = { ...defaultErrors[props?.errorName || ''], ...props };
    return (
        <div className="flex flex-col px-2 py-3 rounded-2xl bg-secondary-400">
            <div className="flex items-start gap-2">
                <span className="shrink-0 p-0.5">{details?.icon}</span>
                <div className="flex flex-col gap-1 flex-1">
                    <p className="text-white font-medium leading-4 text-base mt-0.5">{details?.title}</p>
                    {message ? <p className="text-secondary-text text-sm leading-[18px]">{message}</p> : null}
                </div>
            </div>
            {props?.errorName === 'insufficientFunds' && refreshBalance && (
                <button
                    type="button"
                    onClick={refreshBalance}
                    className="text-primary-text bg-secondary-300 hover:bg-secondary-200 flex justify-center items-end gap-2 py-2.5 px-3 rounded-xl mt-3"
                >
                    <RefreshCw className={`${isBalanceLoading ? 'animate-spin' : ''} w-4 h-4`} />
                    <span className="text-sm font-medium">Refresh</span>
                </button>
            )}
        </div>
    );
};