import { Info, RouteOff } from 'lucide-react';
import { SwapFormValues } from '@/components/DTOs/SwapFormValues';
import { useMemo } from 'react';
import { useSettingsState } from '@/context/settings';
import { useQueryState } from '@/context/query';
import { useFormikContext } from 'formik';
import { QuoteError } from './useFee';
import { useSelectedAccount } from '@/context/balanceAccounts';

const ICON_CLASSES_WARNING = 'w-5 h-5 text-warning-foreground';

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

    let validationMessage: string = '';
    let validationDetails: ValidationDetails = {};

    if (query?.lockToAsset) {
        if (fromCurrency?.status === 'not_found') {
            validationMessage = `Transfers from ${fromDisplayName} ${fromCurrency?.symbol || fromCurrency?.symbol} to this token are not supported`;
            validationDetails = { title: 'Route Unavailable', type: 'warning', icon: <RouteOff className={ICON_CLASSES_WARNING} /> };
        }
        else if (fromCurrency?.status === 'inactive') {
            validationMessage = `Sorry, transfers of ${fromCurrency?.symbol} from ${fromDisplayName} are not available at the moment. Please try later.`;
            validationDetails = { title: 'Temporarily unavailable.', type: 'warning', icon: <Info className={ICON_CLASSES_WARNING} /> };
        }
        else if (!toCurrency) {
            validationMessage = `Sorry, transfers of ${query?.toAsset} to ${toDisplayName || query.to} are not available at the moment. Please try later.`;
            validationDetails = { title: 'Temporarily unavailable.', type: 'warning', icon: <Info className={ICON_CLASSES_WARNING} /> };
        }
    }
    else if (query?.lockFromAsset) {
        if (toCurrency?.status === 'not_found') {
            validationMessage = `Transfers to ${toDisplayName} ${toCurrency?.symbol} from this token are not supported`;
            validationDetails = { title: 'Route Unavailable', type: 'warning', icon: <RouteOff className={ICON_CLASSES_WARNING} /> };
        }
        else if (toCurrency?.status === 'inactive') {
            validationMessage = `Sorry, transfers of ${toCurrency?.symbol} to ${toDisplayName} are not available at the moment. Please try later.`;
            validationDetails = { title: 'Temporarily unavailable.', type: 'warning', icon: <Info className={ICON_CLASSES_WARNING} /> };
        }
        else if (!fromCurrency) {
            validationMessage = `Sorry, transfers of ${query?.fromAsset} from ${fromDisplayName || query.from} are not available at the moment. Please try later.`;
            validationDetails = { title: 'Temporarily unavailable.', type: 'warning', icon: <Info className={ICON_CLASSES_WARNING} /> };
        }
    }
    else if (toCurrency?.status === 'inactive' || fromCurrency?.status === 'inactive') {
        const unfilteredDestinationRoute = allDestinations?.find(r => r.name === to?.name)
        const unfilteredDestinationCurrency = unfilteredDestinationRoute?.tokens?.find(t => t.symbol === toCurrency?.symbol)
        const unfilteredSourceRoute = allSources?.find(r => r.name === from?.name)
        const unfilteredSourceCurrency = unfilteredSourceRoute?.tokens?.find(t => t.symbol === fromCurrency?.symbol)

        if (unfilteredDestinationCurrency?.status === 'inactive') {
            validationMessage = `Sorry, transfers of ${toCurrency?.symbol} to ${toDisplayName} are not available at the moment. Please try later.`;
            validationDetails = { title: 'Temporarily unavailable.', type: 'warning', icon: <Info className={ICON_CLASSES_WARNING} /> };
        }
        else if (unfilteredSourceCurrency?.status === 'inactive') {
            validationMessage = `Sorry, transfers of ${fromCurrency?.symbol} from ${fromDisplayName} are not available at the moment. Please try later.`;
            validationDetails = { title: 'Temporarily unavailable.', type: 'warning', icon: <Info className={ICON_CLASSES_WARNING} /> };
        }
        else {
            validationMessage = `Please change one of the selected tokens or try later.`;
            validationDetails = { title: 'Temporarily unavailable.', type: 'warning', icon: <Info className={ICON_CLASSES_WARNING} /> };
        }
    }
    else if (!validatingSource && !validatingDestination && (toCurrency?.status === 'not_found' || fromCurrency?.status === 'not_found')) {
        validationMessage = 'Please change one of the selected tokens';
        validationDetails = { title: 'Route Unavailable', type: 'warning', icon: <RouteOff className={ICON_CLASSES_WARNING} /> };
    }

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
