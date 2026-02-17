import { SwapFormValues } from '../components/DTOs/SwapFormValues';
import { Address } from '../lib/address';
import { QuoteError } from './useFee';
import { formatUsd } from '@/components/utils/formatUsdAmount';

interface Params {
    values: SwapFormValues;
    minAllowedAmount: number | undefined,
    maxAllowedAmount: number | undefined,
    minAllowedAmountInUsd: number | undefined,
    maxAllowedAmountInUsd: number | undefined,
    isUsdMode: boolean,
    sourceAddress: string | undefined,
    sameAccountNetwork?: string | undefined,
    quoteError?: QuoteError
}

export const FORM_VALIDATION_ERROR_CODES = {
    ROUTE_NOT_FOUND: "ROUTE_NOT_FOUND",
    MIN_AMOUNT_ERROR: "MIN_AMOUNT_ERROR",
    MAX_AMOUNT_ERROR: "MAX_AMOUNT_ERROR",
}


export function resolveFormValidation({ values, maxAllowedAmount, minAllowedAmount, minAllowedAmountInUsd, maxAllowedAmountInUsd, isUsdMode, sourceAddress, sameAccountNetwork, quoteError }: Params) {
    let amount = values.amount ? Number(values.amount) : undefined;

    if (!values.from && !values.fromExchange) {
        return { message: 'Select source' };
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
    if (amount === undefined || isNaN(Number(amount))) {
        return { message: 'Enter an amount' };
    }
    if (amount < 0) {
        return { message: "Can't be negative" };
    }
    if (maxAllowedAmount != undefined && amount > maxAllowedAmount) {
        const displayAmount = isUsdMode && maxAllowedAmountInUsd != undefined ? formatUsd(maxAllowedAmountInUsd) : maxAllowedAmount;
        return { code: FORM_VALIDATION_ERROR_CODES.MAX_AMOUNT_ERROR, message: `Max amount is ${displayAmount}` };
    }
    if (minAllowedAmount != undefined && amount < minAllowedAmount) {
        const displayAmount = isUsdMode && minAllowedAmountInUsd != undefined ? formatUsd(minAllowedAmountInUsd) : minAllowedAmount;
        return { code: FORM_VALIDATION_ERROR_CODES.MIN_AMOUNT_ERROR, message: `Min amount is ${displayAmount}` };
    }
    if (!/^[0-9]*[.,]?[0-9]*$/i.test(amount.toString())) {
        return { message: 'Invalid amount' };
    }
    if (values.to) {
        if (values.destination_address && !Address.isValid(values.destination_address, values.to)) {
            return { message: `Enter a valid ${values.to?.display_name} address` };
        }
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

    const quoteErrorCode = quoteError?.response?.data?.error?.code || quoteError?.code;
    if (quoteError && quoteErrorCode !== "QUOTE_REQUIRES_NO_DEPOSIT_ADDRESS") {
        return { message: 'Route not found', code: FORM_VALIDATION_ERROR_CODES.ROUTE_NOT_FOUND };
    }

    return { message: '' };
}