import React, { createContext, useEffect } from 'react';
import { ReactNode } from 'react';
import { CircleAlert, RouteOff } from 'lucide-react';
import { SwapFormValues } from '../components/DTOs/SwapFormValues';
import { QueryParams } from '../Models/QueryParams';
import { ApiError, LSAPIKnownErrorCode } from '../Models/ApiError';
import { useFormikContext } from 'formik';
import { useQueryState } from './query';

interface ValidationDetails {
    title?: string;
    type?: string;
    icon?: React.ReactNode;
}

interface ValidationContextType {
    validationMessage: string;
    validationDetails: ValidationDetails;
}

const defaultContextValue: ValidationContextType = {
    validationMessage: '',
    validationDetails: {},
};

const ValidationContext = createContext<ValidationContextType>(defaultContextValue);

export const ValidationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {

    const {
        values,
    } = useFormikContext<SwapFormValues>();
    const { to, from, fromCurrency, toCurrency, toExchange, fromExchange, currencyGroup } = values;
    const query = useQueryState();
    const fromDisplayName = fromExchange ? fromExchange.display_name : from?.display_name;
    const toDisplayName = toExchange ? toExchange.display_name : to?.display_name;
    const toUnavailable = toCurrency?.status === 'inactive';
    const fromUnavailable = fromCurrency?.status === 'inactive';
    const exchangeUnavailable = currencyGroup?.status === 'inactive';

    let validationMessage = '';
    let validationDetails: ValidationDetails = {};

    if (currencyGroup?.status === 'not_found') {
        validationMessage = 'Please change one of the selected tokens';
        validationDetails = { title: 'Warning', type: 'warning', icon: <RouteOff stroke='#f8974b' className='w-4 h-4 ' /> };
    } else if (currencyGroup?.status === 'inactive') {
        const unavailableDirection = fromUnavailable ? `${fromDisplayName} ${fromCurrency.symbol}` : exchangeUnavailable ? `${fromExchange ? fromDisplayName : toDisplayName} ${currencyGroup?.symbol}` : `${toDisplayName} ${toCurrency?.symbol}`;
        validationMessage = `Sorry, transfers ${fromUnavailable || (exchangeUnavailable && fromExchange) ? 'from' : 'to'} ${unavailableDirection} are not available at the moment. Please try later.`;
        validationDetails = { title: 'Temporarily unavailable', type: 'warning', icon: <CircleAlert stroke='#f8974b' className='w-4 h-4 ' /> };
    } else if (fromCurrency?.status === 'not_found') {
        validationMessage = 'Please change one of the selected tokens';
        validationDetails = { title: 'Route Unavailable', type: 'warning', icon: <RouteOff stroke='#f8974b' className='w-4 h-4 ' /> };
    } else if (fromCurrency?.status === 'inactive') {
        const unavailableDirection = fromUnavailable ? `${fromDisplayName} ${fromCurrency.symbol}` : '';
        validationMessage = `Sorry, transfers from ${unavailableDirection} are not available at the moment. Please try later.`;
        validationDetails = { title: 'Temporarily unavailable.', type: 'warning', icon: <CircleAlert stroke='#f8974b' className='w-4 h-4 ' /> };
    } else if (toCurrency?.status === 'not_found') {
        validationMessage = 'Please change one of the selected tokens';
        validationDetails = { title: 'Route Unavailable', type: 'warning', icon: <RouteOff stroke='#f8974b' className='w-4 h-4 ' /> };
    } else if (toCurrency?.status === 'inactive') {
        const unavailableDirection = toUnavailable ? `${toDisplayName} ${toCurrency.symbol}` : '';
        validationMessage = `Sorry, transfers to ${unavailableDirection} are not available at the moment. Please try later.`;
        validationDetails = { title: 'Temporarily unavailable.', type: 'warning', icon: <CircleAlert stroke='#f8974b' className='w-4 h-4 ' /> };
    }
    // TODO:supply apierror
    // else if (routeNotFoundError) {
    //     validationMessage = 'Please change one of the selected tokens';
    //     validationDetails = { title: 'Warning', type: 'warning', icon: <RouteOff stroke='#f8974b' className='w-4 h-4 ' /> };
    // } 
    else if (query?.lockFrom) {
        validationMessage = `No routes available between ${fromDisplayName} and this token`;
        validationDetails = { title: 'Warning', type: 'warning', icon: <RouteOff stroke='#f8974b' className='w-4 h-4 ' /> };
    } else if (query?.lockTo) {
        validationMessage = `No routes available between ${toDisplayName} and this token`;
        validationDetails = { title: 'Warning', type: 'warning', icon: <RouteOff stroke='#f8974b' className='w-4 h-4 ' /> };
    } else if (query?.lockFromAsset) {
        validationMessage = `Transfers from ${fromDisplayName} ${fromCurrency?.symbol} to this token are not supported`;
        validationDetails = { title: 'Warning', type: 'warning', icon: <RouteOff stroke='#f8974b' className='w-4 h-4 ' /> };
    } else if (query?.lockToAsset) {
        validationMessage = `Transfers to ${toDisplayName} ${toCurrency?.symbol} from this token are not supported`;
        validationDetails = { title: 'Warning', type: 'warning', icon: <RouteOff stroke='#f8974b' className='w-4 h-4 ' /> };
    }

    return (
        <ValidationContext.Provider
            value={{ validationMessage, validationDetails }}
        >
            {children}
        </ValidationContext.Provider>
    );
};

export const useValidationContext = () => React.useContext(ValidationContext);