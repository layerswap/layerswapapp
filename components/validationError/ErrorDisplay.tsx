import { ValidationDetails } from '@/context/validationContext';
import { RouteOff } from 'lucide-react';
import React from 'react';
import { ICON_CLASSES_WARNING } from './constants';
import InfoIcon from "@/components/icons/InfoIcon";

interface ErrorDisplayProps {
    message?: string;
    details: ValidationDetails;
}

export const defaultErrors: { [errorName: string]: ErrorDisplayProps } = {
    "insufficientFunds": {
        details: { title: "Insufficient Balance", type: 'warning', icon: <InfoIcon className={ICON_CLASSES_WARNING} /> }
    },
    "quoteError": {
        message: "Unable to retrieve quote",
        details: { title: "Unable to retrieve quote", type: 'warning', icon: <RouteOff className={ICON_CLASSES_WARNING} /> }
    }
}
export const ErrorDisplay: React.FC<Partial<ErrorDisplayProps & { errorName?: string }>> = (props) => {
    const { message, details } = { ...defaultErrors[props?.errorName || ''], ...props };
    return (
        <div className="px-2 py-3 rounded-2xl bg-secondary-500">
            <div className="flex items-start gap-2">
                <span className="shrink-0 p-0.5">{details?.icon}</span>
                <div className="flex flex-col gap-1">
                    <p className="text-white font-medium leading-4 text-base mt-0.5">{details?.title}</p>
                    {message ? <p className="text-secondary-text text-sm leading-4.5">{message}</p> : null}
                </div>
            </div>
        </div>
    );
};