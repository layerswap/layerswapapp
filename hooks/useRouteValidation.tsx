import { RouteOff } from 'lucide-react';
import { SwapFormValues } from '@/components/DTOs/SwapFormValues';
import { useMemo } from 'react';
import { useQueryState } from '@/context/query';
import { useFormikContext } from 'formik';
import { QuoteError } from './useFee';
import { useSelectedAccount } from '@/context/balanceAccounts';
import { ICON_CLASSES_WARNING } from '@/components/validationError/constants';

interface ValidationDetails {
    title?: string;
    type?: string;
    icon?: React.ReactNode;
}

export function resolveRouteValidation(quoteError?: QuoteError) {
    const { values } = useFormikContext<SwapFormValues>();
    const { to, from, destination_address, fromAsset, toAsset } = values;
    const selectedSourceAccount = useSelectedAccount("from", from?.name);
    const query = useQueryState();
    const quoteErrorCode = quoteError?.response?.data?.error?.code || quoteError?.code;
    let validationMessage: string = '';
    let validationDetails: ValidationDetails = {};



    if (((from?.name && from?.name.toLowerCase() === query.sameAccountNetwork?.toLowerCase()) || (to?.name && to?.name.toLowerCase() === query.sameAccountNetwork?.toLowerCase()))) {
        const network = from?.name.toLowerCase() === query.sameAccountNetwork?.toLowerCase() ? from : to;
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
