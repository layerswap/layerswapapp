import { useValidationContext } from '@/context/validationContext';
import React from 'react';

const ValidationError: React.FC = () => {
    const { routeValidation } = useValidationContext();

    if (!routeValidation.message) return null;

    return (
        <div className="p-2.5 my-2.5 relative rounded-2xl bg-secondary-400">
            <div className='flex items-center'>
                {routeValidation.details.icon}
                <p className='text-white font-medium ml-1'>{routeValidation.details.title}</p>
            </div>
            <p className="text-secondary-text ml-5 mt-1 text-sm">{routeValidation.message}</p>
        </div>
    );
};

export default ValidationError;