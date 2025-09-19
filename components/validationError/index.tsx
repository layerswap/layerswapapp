import { useValidationContext } from '@/context/validationContext';
import React from 'react';

const ValidationError: React.FC = () => {
    const { routeValidation } = useValidationContext();

    if (!routeValidation.message) return null;

    return (
        <div className="px-2 py-3 rounded-2xl bg-secondary-400">
            <div className="flex items-start gap-2">
                <span className="shrink-0">{routeValidation.details.icon}</span>
                <div className="flex flex-col gap-1">
                    <p className="text-white font-medium leading-4 text-base">{routeValidation.details.title}</p>
                    <p className="text-secondary-text text-sm leading-[18px]">{routeValidation.message}</p>
                </div>
            </div>
        </div>
    );
};

export default ValidationError;