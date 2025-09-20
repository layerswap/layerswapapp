import { useValidationContext } from '@/context/validationContext';
import React from 'react';
import { ErrorDisplay } from './DisplayError';

const ValidationError: React.FC = () => {
    const { routeValidation } = useValidationContext();

    if (!routeValidation.message) return null;

    return (<ErrorDisplay {...routeValidation} />);
};

export default ValidationError;