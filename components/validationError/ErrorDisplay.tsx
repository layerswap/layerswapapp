import { ValidationDetails } from '@/context/validationContext';
import { ArrowLeft, RefreshCw, RouteOff } from 'lucide-react';
import React, { useCallback, useRef, useState } from 'react';
import { ICON_CLASSES_WARNING } from './constants';
import InfoIcon from "@/components/icons/InfoIcon";

interface ErrorDisplayProps {
    message?: string;
    details: ValidationDetails;
    refreshBalance?: () => void;
    isBalanceLoading?: boolean;
    onEditAmount?: () => void;
    balanceAmount?: string;
    tokenSymbol?: string;
}

export const defaultErrors: { [errorName: string]: ErrorDisplayProps } = {
    "insufficientFunds": {
        details: { title: "Insufficient balance", type: 'warning', icon: <InfoIcon className={ICON_CLASSES_WARNING} /> },
        message: "If you recently added funds, refresh the balance or check your connected wallet"
    },
    "quoteError": {
        message: "Unable to retrieve quote",
        details: { title: "Unable to retrieve quote", type: 'warning', icon: <RouteOff className={ICON_CLASSES_WARNING} /> }
    },
    "outOfGas": {
        details: { title: "Insufficient balance for gas", type: 'warning', icon: <InfoIcon className={ICON_CLASSES_WARNING} /> },
        message: "You need a small balance remaining to pay for gas. Use the Max button to automatically adjust the amount."
    }
}
const MIN_SPIN_DURATION = 1000;

export const ErrorDisplay: React.FC<Partial<ErrorDisplayProps & { errorName?: string }>> = (props) => {
    const { message, details, refreshBalance, isBalanceLoading, onEditAmount, balanceAmount, tokenSymbol } = { ...defaultErrors[props?.errorName || ''], ...props };
    const [isSpinning, setIsSpinning] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout>>();

    const handleRefresh = useCallback(() => {
        clearTimeout(timerRef.current);
        setIsSpinning(true);
        refreshBalance?.();
        timerRef.current = setTimeout(() => setIsSpinning(false), MIN_SPIN_DURATION);
    }, [refreshBalance]);

    const showSpinner = isSpinning || isBalanceLoading;

    return (
        <div className="flex flex-col p-3 rounded-2xl bg-secondary-400">
            <div className="flex items-start gap-2">
                <span className="shrink-0 p-0.5">{details?.icon}</span>
                <div className="flex flex-col gap-1 flex-1">
                    <p className="text-white font-medium leading-4 text-base mt-0.5">
                        {details?.title}
                        {balanceAmount && tokenSymbol && (
                            <span
                                className={`font-normal text-sm ${showSpinner ? 'animate-shine bg-[linear-gradient(90deg,var(--color-secondary-text)_40%,white_50%,var(--color-secondary-text)_60%)] bg-[length:200%_100%] bg-clip-text text-transparent' : 'text-secondary-text'}`}
                            > ({balanceAmount} {tokenSymbol})</span>
                        )}
                    </p>
                    {message ? <p className="text-secondary-text text-sm leading-4.5">{message}</p> : null}
                </div>
            </div>
            {props?.errorName === 'insufficientFunds' && refreshBalance && (
                <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={showSpinner}
                    className="text-primary-text disabled:text-secondary-text bg-secondary-300 hover:bg-secondary-200 flex justify-center items-end gap-2 py-2.5 px-3 rounded-xl mt-3"
                >
                    <RefreshCw className={`${showSpinner ? 'animate-spin' : ''} w-4 h-4`} />
                    <span className="text-sm font-medium">Refresh</span>
                </button>
            )}
            {props?.errorName === 'outOfGas' && onEditAmount && (
                <button
                    type="button"
                    onClick={onEditAmount}
                    className="text-primary-text bg-secondary-300 hover:bg-secondary-200 flex justify-center items-center gap-2 py-2.5 px-3 rounded-xl mt-3"
                >
                    <ArrowLeft className="w-5 h-5 stroke-1" />
                    <span className="text-sm font-medium">Edit amount</span>
                </button>
            )}
        </div>
    );
};