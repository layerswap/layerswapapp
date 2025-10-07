import { RouteOff } from 'lucide-react';
import { SwapFormValues } from '@/components/DTOs/SwapFormValues';
import { useMemo } from 'react';
import { useSettingsState } from '@/context/settings';
import { useQueryState } from '@/context/query';
import { useFormikContext } from 'formik';
import { QuoteError } from './useFee';
import { useSelectedAccount } from '@/context/balanceAccounts';
import { useSwapDataState } from '@/context/swap';
import { ICON_CLASSES_WARNING } from '@/components/validationError/constants';
import { useBalance } from '@/lib/balances/useBalance';

interface ValidationDetails {
    title?: string;
    type?: string;
    icon?: React.ReactNode;
}

export function resolveRouteValidation(quoteError?: QuoteError) {
    const { values } = useFormikContext<SwapFormValues>();
    const { destinationRoutes: allDestinations, sourceRoutes: allSources } = useSettingsState()
    const { to, from, fromAsset: fromCurrency, toAsset: toCurrency, fromExchange, validatingSource, validatingDestination, destination_address } = values;
    const selectedSourceAccount = useSelectedAccount("from", from?.name);
    const query = useQueryState();
    const fromDisplayName = fromExchange ? fromExchange.display_name : from?.display_name;
    const toDisplayName = to?.display_name;
    const quoteMessage = quoteError?.response?.data?.error?.message || quoteError?.message

    const { balances } = useBalance(selectedSourceAccount?.address, from)
    const walletBalance = from && balances?.find(b => b?.network === from?.name && b?.token === fromCurrency?.symbol)
    const walletBalanceAmount = walletBalance?.amount

    const { swapModalOpen } = useSwapDataState()

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

    if (quoteError) {
        validationMessage = '';
        validationDetails = { title: quoteMessage || 'Unable to retrieve quote', type: 'warning', icon: <RouteOff className={ICON_CLASSES_WARNING} /> };
    }

    const value = useMemo(() => ({
        message: validationMessage,
        details: validationDetails
    }), [validationMessage, validationDetails]);

    return value
}
