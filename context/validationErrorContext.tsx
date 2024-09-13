import React, { createContext, useEffect } from 'react';
import { ReactNode } from 'react';
import { CircleAlert, RouteOff } from 'lucide-react';
import { SwapFormValues } from '../components/DTOs/SwapFormValues';
import { QueryParams } from '../Models/QueryParams';
import { ApiError, LSAPIKnownErrorCode } from '../Models/ApiError';
import { useFormikContext } from 'formik';
import { useQueryState } from './query';
import { resolveRoutesURLForSelectedToken } from '../helpers/routes';
import useSWR from 'swr';
import { ApiResponse } from '../Models/ApiResponse';
import { RouteNetwork } from '../Models/Network';
import LayerSwapApiClient from '../lib/layerSwapApiClient';
import { useSettingsState } from './settings';

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

    const { destinationRoutes: allDestinations, sourceRoutes: allSources } = useSettingsState()

    const { to, from, fromCurrency, toCurrency, toExchange, fromExchange, currencyGroup } = values;
    const query = useQueryState();
    const fromDisplayName = fromExchange ? fromExchange.display_name : from?.display_name;
    const toDisplayName = toExchange ? toExchange.display_name : to?.display_name;

    let validationMessage = '';
    let validationDetails: ValidationDetails = {};

    const layerswapApiClient = new LayerSwapApiClient()

    if (query?.lockToAsset) {
        if (fromCurrency?.status === 'not_found') {
            validationMessage = `Transfers from ${fromDisplayName} ${fromCurrency.symbol} to this token are not supported`;
            validationDetails = { title: 'Route Unavailable', type: 'warning', icon: <RouteOff stroke='#f8974b' className='w-4 h-4 ' /> };
        }
        else if (fromCurrency?.status === 'inactive') {
            validationMessage = `Sorry, transfers from ${fromDisplayName} ${fromCurrency.symbol} are not available at the moment. Please try later.`;
            validationDetails = { title: 'Temporarily unavailable.', type: 'warning', icon: <CircleAlert stroke='#f8974b' className='w-4 h-4 ' /> };
        }
        else if (!fromCurrency) {
            validationMessage = `Sorry, transfers to ${toDisplayName || query.to} ${query?.toAsset} are not available at the moment. Please try later.`;
            validationDetails = { title: 'Temporarily unavailable.', type: 'warning', icon: <CircleAlert stroke='#f8974b' className='w-4 h-4 ' /> };
        }
    }
    else if (query?.lockFromAsset) {
        if (toCurrency?.status === 'not_found') {
            validationMessage = `Transfers to ${toDisplayName} ${toCurrency?.symbol} from this token are not supported`;
            validationDetails = { title: 'Route Unavailable', type: 'warning', icon: <RouteOff stroke='#f8974b' className='w-4 h-4 ' /> };
        }
        else if (toCurrency?.status === 'inactive') {
            validationMessage = `Sorry, transfers to ${toDisplayName} ${toCurrency?.symbol} are not available at the moment. Please try later.`;
            validationDetails = { title: 'Temporarily unavailable.', type: 'warning', icon: <CircleAlert stroke='#f8974b' className='w-4 h-4 ' /> };
        }
        else if (!fromCurrency) {
            validationMessage = `Sorry, transfers from ${fromDisplayName || query.from} ${query?.fromAsset} are not available at the moment. Please try later.`;
            validationDetails = { title: 'Temporarily unavailable.', type: 'warning', icon: <CircleAlert stroke='#f8974b' className='w-4 h-4 ' /> };
        }
    }
    else if (toCurrency?.status === 'inactive' || fromCurrency?.status === 'inactive' || currencyGroup?.status === 'inactive') {
        const unfilteredDestinationRoute = allDestinations?.find(r => r.name === to?.name)
        const unfilteredDestinationCurrency = unfilteredDestinationRoute?.tokens?.find(t => t.symbol === toCurrency?.symbol)
        const unfilteredSourceRoute = allSources?.find(r => r.name === from?.name)
        const unfilteredSourceCurrency = unfilteredSourceRoute?.tokens?.find(t => t.symbol === fromCurrency?.symbol)

        if (unfilteredDestinationCurrency?.status === 'inactive') {
            const unavailableDirection = `${toDisplayName} ${toCurrency?.symbol}`;
            validationMessage = `Sorry, transfers to ${unavailableDirection} are not available at the moment. Please try later.`;
            validationDetails = { title: 'Temporarily unavailable.', type: 'warning', icon: <CircleAlert stroke='#f8974b' className='w-4 h-4 ' /> };
        }
        else if (unfilteredSourceCurrency?.status === 'inactive') {
            const unavailableDirection = `${fromDisplayName} ${fromCurrency?.symbol}`;
            validationMessage = `Sorry, transfers from ${unavailableDirection} are not available at the moment. Please try later.`;
            validationDetails = { title: 'Temporarily unavailable.', type: 'warning', icon: <CircleAlert stroke='#f8974b' className='w-4 h-4 ' /> };
        }
        else {
            validationMessage = `Please change one of the selected tokens or try later.`;
            validationDetails = { title: 'Temporarily unavailable.', type: 'warning', icon: <CircleAlert stroke='#f8974b' className='w-4 h-4 ' /> };
        }
    }
    else if (currencyGroup?.status === 'not_found' || toCurrency?.status === 'not_found' || fromCurrency?.status === 'not_found') {
        validationMessage = 'Please change one of the selected tokens';
        validationDetails = { title: 'Route Unavailable', type: 'warning', icon: <RouteOff stroke='#f8974b' className='w-4 h-4 ' /> };
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