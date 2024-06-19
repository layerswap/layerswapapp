import React from 'react';
import useValidationErrorStore from './validationErrorStore';
import RouteIcon from '../icons/RouteIcon';

const ValidationError: React.FC = () => {
    const { header, message, messageType, clearValidationMessage } = useValidationErrorStore();

    if (!message) return null;

    return (
        <div className={`p-2.5 my-2.5 relative rounded-md bg-secondary-700 border-l-8 ${messageType === "warning" ? "border-orange-400" : "border-red-400"}`}>
            <div className='flex items-center'>
                <RouteIcon messageType={messageType} />
                <p className='text-white font-medium ml-1'>{header}</p>
            </div>
            <p className="text-white ml-5 mt-1">{message}</p>
        </div>
    );
};

export default ValidationError;