import { useValidationContext } from '@/context/validationContext';
import React from 'react';
import { ErrorDisplay } from './ErrorDisplay';

const ValidationError: React.FC = () => {
    const { routeValidation } = useValidationContext();

    if (!routeValidation.message) return null;

    return (
        <ErrorDisplay
            icon={routeValidation.details.icon}
            title={routeValidation.details.title}
            message={routeValidation.message}
        />
    );
};

export default ValidationError;
