import { SwapFormValues } from '@/components/Pages/Swap/Form/SwapFormValues';
import { isValidAddress } from '../lib/address/validator';
import { QuoteError } from './useFee';

interface Params {
    values: SwapFormValues;
    minAllowedAmount: number | undefined,
    maxAllowedAmount: number | undefined,
    sourceAddress: string | undefined,
    sameAccountNetwork?: string | undefined,
    quoteError?: QuoteError
}

export function resolveFormValidation({ values, maxAllowedAmount, minAllowedAmount, sourceAddress, sameAccountNetwork, quoteError }: Params) {
    let amount = values.amount ? Number(values.amount) : undefined;

    if (!values.from && !values.fromExchange) {
        return { message: 'Select source' };
    }
    if (values.fromExchange && values.toAsset && values.toAsset?.status === 'inactive') {
        return { message: 'Route unavailable' };
    }
    if (!values.to) {
        return { message: 'Select destination' };
    }
    if (!values.fromAsset) {
        return { message: 'Select source asset' };
    }
    if (!values.toAsset) {
        return { message: 'Select destination asset' };
    }
    if (!amount) {
        return { message: 'Enter an amount' };
    }
    if (!/^[0-9]*[.,]?[0-9]*$/i.test(amount.toString())) {
        return { message: 'Invalid amount' };
    }
    if (amount < 0) {
        return { message: "Can't be negative" };
    }
    if (maxAllowedAmount != undefined && amount > maxAllowedAmount) {
        return { message: `Max amount is ${maxAllowedAmount}` };
    }
    if (minAllowedAmount != undefined && amount < minAllowedAmount) {
        return { message: `Min amount is ${minAllowedAmount}` };
    }

    if (values.to) {
        if (values.destination_address && !isValidAddress(values.destination_address, values.to)) {
            return { message: `Enter a valid ${values.to?.display_name} address` };
        }
    }

    if (
        values.fromAsset?.status === 'not_found' ||
        values.toAsset?.status === 'not_found'
    ) {
        return { message: `Route unavailable` };
    }

    if (
        values.fromAsset?.status === 'inactive' ||
        values.toAsset?.status === 'inactive'
    ) {
        return { message: `Route unavailable` };
    }

    if (
        values.from?.name.toLowerCase() === sameAccountNetwork?.toLowerCase() ||
        values.to?.name.toLowerCase() === sameAccountNetwork?.toLowerCase()
    ) {
        if (
            sourceAddress &&
            values.destination_address &&
            sourceAddress.toLowerCase() !== values.destination_address.toLowerCase()
        ) {
            return { message: `Address update required` };
        }

        if (values.depositMethod === "deposit_address") {
            return { message: 'Manual Transfer is not supported' };
        }
    }

    if (quoteError) {
        return { message: quoteError.response?.data?.error?.message || 'Unable to retrieve quote' };
    }

    return { message: '' };
}