import { useValidationContext } from '@/context/validationContext';
import React from 'react';
import { ErrorDisplay } from './ErrorDisplay';

const ValidationError: React.FC = () => {
    const { routeValidation } = useValidationContext();

    if (!routeValidation.message) return null;

    return (
        <div className="mt-2">
            <ErrorDisplay
                icon={routeValidation.details.icon}
                title={routeValidation.details.title}
                message={routeValidation.message}
            />
        </div>
    );
};

export default ValidationError;
