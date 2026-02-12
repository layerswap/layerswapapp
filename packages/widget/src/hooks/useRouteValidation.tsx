import { RouteOff } from 'lucide-react';
import { useMemo } from 'react';
import { useInitialSettings } from '@/context/settings';
import { useFormikContext } from 'formik';
import { QuoteError } from './useFee';
import { useSelectedAccount } from '@/context/swapAccounts';
import { SwapFormValues } from '@/components/Pages/Swap/Form/SwapFormValues';
import { ICON_CLASSES_WARNING } from '@/components/Pages/Swap/Form/SecondaryComponents/validationError/constants';

interface ValidationDetails {
    title?: string;
    type?: string;
    icon?: React.ReactNode;
}

export function useRouteValidation(quoteError?: QuoteError, hasQuote?: boolean, _isQuoteLoading?: boolean, autoSlippageWouldWork?: boolean) {
    const { values } = useFormikContext<SwapFormValues>();
    const { to, from, destination_address } = values;
    const selectedSourceAccount = useSelectedAccount("from", from?.name);
    const initialSettings = useInitialSettings();
    const quoteErrorCode = quoteError?.response?.data?.error?.code || quoteError?.code;

    let validationMessage: string = '';
    let validationDetails: ValidationDetails = {};

    if (!hasQuote && autoSlippageWouldWork) {
        validationDetails = { title: 'Route Unavailable', type: 'warning', icon: <RouteOff className={ICON_CLASSES_WARNING} /> };
        validationMessage = `This might be because of high slippage, try switching the slippage percentage to "Auto"`;
    }

    if (((from?.name && from?.name.toLowerCase() === initialSettings.sameAccountNetwork?.toLowerCase()) || (to?.name && to?.name.toLowerCase() === initialSettings.sameAccountNetwork?.toLowerCase()))) {
        const network = from?.name.toLowerCase() === initialSettings.sameAccountNetwork?.toLowerCase() ? from : to;
        if ((selectedSourceAccount && destination_address && selectedSourceAccount?.address?.toLowerCase() !== destination_address?.toLowerCase())) {
            validationMessage = `Transfers between ${network?.display_name} and other chains are only allowed within the same account. Please make sure you're using the same address on both source and destination.`;
            validationDetails = { title: 'Action Needed', type: 'warning', icon: <RouteOff className={ICON_CLASSES_WARNING} /> };
        }

        if (values.depositMethod === "deposit_address") {
            validationMessage = `Manually transferring between ${from?.display_name} and ${to?.display_name} networks is not supported.`;
            validationDetails = { title: 'Manual Transfer is not supported', type: 'warning', icon: <RouteOff className={ICON_CLASSES_WARNING} /> };
        }
    }

    if (quoteErrorCode === "QUOTE_REQUIRES_NO_DEPOSIT_ADDRESS") {
        validationDetails = { title: 'Manual swapping is not supported', type: 'warning', icon: <RouteOff className={ICON_CLASSES_WARNING} /> };
        validationMessage = `Swaps via manual transfer are not supported for this route. Please select a wallet to send from.`;
    }

    const value = useMemo(() => ({
        message: validationMessage,
        details: validationDetails
    }), [validationMessage, validationDetails]);

    return value
}
