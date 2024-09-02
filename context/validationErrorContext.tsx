import React, { createContext, useEffect } from 'react';
import { ReactNode } from 'react';
import { CircleAlert, RouteOff } from 'lucide-react';
import { SwapFormValues } from '../components/DTOs/SwapFormValues';
import { QueryParams } from '../Models/QueryParams';
import { ApiError, LSAPIKnownErrorCode } from '../Models/ApiError';
import { useFormikContext } from 'formik';

interface ValidationDetails {
    title?: string;
    type?: string;
    icon?: React.ReactNode;
}

interface ValidationContextType {
    validationMessage: string;
    validationDetails: ValidationDetails;
    updateValidationMessage: (title: string, message: string, type: string, icon: React.ReactNode) => void;
    clearValidationMessage: () => void;
    resolveValidationMessage: (values: SwapFormValues, query?: QueryParams, error?: ApiError) => void;
}

const defaultContextValue: ValidationContextType = {
    validationMessage: '',
    validationDetails: {},
    updateValidationMessage: () => { },
    clearValidationMessage: () => { },
    resolveValidationMessage: () => { },
};

const ValidationContext = createContext<ValidationContextType>(defaultContextValue);

export const ValidationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [validationMessage, setValidationMessage] = React.useState('');
    const [validationDetails, setValidationDetails] = React.useState<ValidationDetails>({});

    const {
        values,
    } = useFormikContext<SwapFormValues>();

    const updateValidationMessage = (title: string, message: string, type: string, icon: React.ReactNode) => {
        setValidationMessage(message);
        setValidationDetails({ title, type, icon });
    };

    const clearValidationMessage = () => {
        setValidationMessage('');
        setValidationDetails({});
    };

    useEffect(() => {
        resolveValidationMessage(values);
    }, [values]);

    const resolveValidationMessage = (values: SwapFormValues, query?: QueryParams, error?: ApiError) => {
        const { to, from, fromCurrency, toCurrency, toExchange, fromExchange, currencyGroup } = values;

        const fromDisplayName = fromExchange ? fromExchange.display_name : from?.display_name;
        const toDisplayName = toExchange ? toExchange.display_name : to?.display_name;

        const toUnavailable = toCurrency?.status === 'inactive';
        const fromUnavailable = fromCurrency?.status === 'inactive';
        const exchangeUnavailable = currencyGroup?.status === 'inactive';
        const routeNotFoundError = error?.code === LSAPIKnownErrorCode.ROUTE_NOT_FOUND_ERROR;

        if (currencyGroup?.status === 'not_found') {
            updateValidationMessage('Warning', 'Please change one of the selected tokens', 'warning', <RouteOff stroke='#f8974b' className='w-4 h-4 ' />);
        } else if (currencyGroup?.status === 'inactive') {
            const unavailableDirection = fromUnavailable ? `${fromDisplayName} ${fromCurrency}` : exchangeUnavailable ? `${fromExchange ? fromDisplayName : toDisplayName} ${currencyGroup?.symbol}` : `${toDisplayName} ${toCurrency}`;
            updateValidationMessage('Temporarily unavailable', `Sorry, transfers ${fromUnavailable || (exchangeUnavailable && fromExchange) ? 'from' : 'to'} ${unavailableDirection} are not available at the moment. Please try later.`, 'warning', <CircleAlert stroke='#f8974b' className='w-4 h-4 ' />);
        } else if (fromCurrency?.status === 'not_found') {
            updateValidationMessage('Route Unavailable', 'Please change one of the selected tokens', 'warning', <RouteOff stroke='#f8974b' className='w-4 h-4 ' />);
        } else if (fromCurrency?.status === 'inactive') {
            const unavailableDirection = fromUnavailable ? `${fromDisplayName} ${fromCurrency}` : '';
            updateValidationMessage('Temporarily unavailable.', `Sorry, transfers from ${unavailableDirection} are not available at the moment. Please try later.`, 'warning', <CircleAlert stroke='#f8974b' className='w-4 h-4 ' />);
        } else if (toCurrency?.status === 'not_found') {
            updateValidationMessage('Route Unavailable', 'Please change one of the selected tokens', 'warning', <RouteOff stroke='#f8974b' className='w-4 h-4 ' />);
        } else if (toCurrency?.status === 'inactive') {
            const unavailableDirection = toUnavailable ? `${toDisplayName} ${toCurrency}` : '';
            updateValidationMessage('Temporarily unavailable.', `Sorry, transfers to ${unavailableDirection} are not available at the moment. Please try later.`, 'warning', <CircleAlert stroke='#f8974b' className='w-4 h-4 ' />);
        } else if (routeNotFoundError) {
            updateValidationMessage('Warning', 'Please change one of the selected tokens', 'warning', <RouteOff stroke='#f8974b' className='w-4 h-4 ' />);
        } else if (query?.lockFrom) {
            updateValidationMessage('Warning', `No routes available between ${fromDisplayName} and this token`, 'warning', <RouteOff stroke='#f8974b' className='w-4 h-4 ' />);
        } else if (query?.lockTo) {
            updateValidationMessage('Warning', `No routes available between ${toDisplayName} and this token`, 'warning', <RouteOff stroke='#f8974b' className='w-4 h-4 ' />);
        } else if (query?.lockFromAsset) {
            updateValidationMessage('Warning', `Transfers from ${fromDisplayName} ${fromCurrency?.symbol} to this token are not supported`, 'warning', <RouteOff stroke='#f8974b' className='w-4 h-4 ' />);
        } else if (query?.lockToAsset) {
            updateValidationMessage('Warning', `Transfers to ${toDisplayName} ${toCurrency?.symbol} from this token are not supported`, 'warning', <RouteOff stroke='#f8974b' className='w-4 h-4 ' />);
        } else {
            clearValidationMessage();
        }
    };

    return (
        <ValidationContext.Provider
            value={{ validationMessage, validationDetails, updateValidationMessage, clearValidationMessage, resolveValidationMessage }}
        >
            {children}
        </ValidationContext.Provider>
    );
};

export const useValidationContext = () => React.useContext(ValidationContext);