import { SwapFormValues } from '@/components/Pages/Swap/Form/SwapFormValues';
import { QuoteError } from './useFee';
import { Address } from '@/lib/address/Address';
import { ceilUsd, floorUsd } from '@/components/utils/formatUsdAmount';
import { isDepositAddressFlow } from '@/helpers/swapFlow';

interface Params {
    values: SwapFormValues;
    minAllowedAmount: number | undefined,
    maxAllowedAmount: number | undefined,
    minAllowedAmountInUsd: number | undefined,
    maxAllowedAmountInUsd: number | undefined,
    isUsdMode: boolean,
    sourceAddress: string | undefined,
    sameAccountNetwork?: string | undefined,
    quoteError?: QuoteError,
    noExchangeWithdrawalRoute?: boolean
}

export const FORM_VALIDATION_ERROR_CODES = {
    ROUTE_NOT_FOUND: "ROUTE_NOT_FOUND",
    RATE_NOT_AVAILABLE: "RATE_NOT_AVAILABLE",
    MIN_AMOUNT_ERROR: "MIN_AMOUNT_ERROR",
    MAX_AMOUNT_ERROR: "MAX_AMOUNT_ERROR",
}


export function resolveFormValidation({ values, maxAllowedAmount, minAllowedAmount, minAllowedAmountInUsd, maxAllowedAmountInUsd, isUsdMode, sourceAddress, sameAccountNetwork, quoteError, noExchangeWithdrawalRoute }: Params) {
    let amount = values.amount ? Number(values.amount) : undefined;

    // Deposit address flow without exchange: no amount or exchange required
    const depositAddressFlow = isDepositAddressFlow(values.depositMethod, values.fromExchange);

    if (!depositAddressFlow && !values.from && !values.fromExchange) {
        return { message: 'Select source' };
    }
    if (!values.to) {
        return { message: 'Select destination' };
    }
    if (noExchangeWithdrawalRoute) {
        return { message: 'Route not found', code: FORM_VALIDATION_ERROR_CODES.ROUTE_NOT_FOUND };
    }
    if (!depositAddressFlow && !values.fromExchange && !values.fromAsset) {
        return { message: 'Select source asset' };
    }
    if (!values.toAsset) {
        return { message: 'Select destination asset' };
    }
    if (!depositAddressFlow) {
        if (amount === undefined || isNaN(Number(amount))) {
            return { message: 'Enter an amount' };
        }
        if (amount < 0) {
            return { message: "Can't be negative" };
        }
        if (maxAllowedAmount != undefined && amount > maxAllowedAmount) {
            // In USD mode, floor the USD limit so the displayed max stays within the actual limit
            const displayAmount = isUsdMode && maxAllowedAmountInUsd != undefined ? `$${floorUsd(maxAllowedAmountInUsd)}` : maxAllowedAmount;
            return { code: FORM_VALIDATION_ERROR_CODES.MAX_AMOUNT_ERROR, message: `Max amount is ${displayAmount}` };
        }
        if (minAllowedAmount != undefined && amount < minAllowedAmount) {
            // In USD mode, ceil the USD limit so the displayed min, when entered, always satisfies the token limit
            const displayAmount = isUsdMode && minAllowedAmountInUsd != undefined ? `$${ceilUsd(minAllowedAmountInUsd)}` : minAllowedAmount;
            return { code: FORM_VALIDATION_ERROR_CODES.MIN_AMOUNT_ERROR, message: `Min amount is ${displayAmount}` };
        }
        if (!/^[0-9]*[.,]?[0-9]*$/i.test(amount.toString())) {
            return { message: 'Invalid amount' };
        }
    }
    if (depositAddressFlow) {
        if (!values.from || !values.fromAsset) {
            return { message: 'No source route available' };
        }
        if (!values.destination_address) {
            return { message: 'Enter destination address' };
        }
    }

    if (values.to) {
        if (values.destination_address && !Address.isValid(values.destination_address, values.to)) {
            return { message: `Enter a valid ${values.to?.display_name} address` };
        }
    }

    if (!depositAddressFlow) {
        if (
            (values.from?.name && values.from?.name.toLowerCase() === sameAccountNetwork?.toLowerCase()) ||
            (values.to?.name && values.to?.name.toLowerCase() === sameAccountNetwork?.toLowerCase())
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
    }

    const quoteErrorCode = quoteError?.response?.data?.error?.code || quoteError?.code;
    const quoteErrorMessage = quoteError?.response?.data?.error?.message || quoteError?.message;
    if (quoteError && quoteErrorCode !== "QUOTE_REQUIRES_NO_DEPOSIT_ADDRESS") {
        if (quoteErrorCode === "ROUTE_NOT_FOUND_ERROR" && quoteErrorMessage === "Rate not available") {
            return { message: 'Price impact too high', code: FORM_VALIDATION_ERROR_CODES.RATE_NOT_AVAILABLE };
        }
        return { message: 'Route not found', code: FORM_VALIDATION_ERROR_CODES.ROUTE_NOT_FOUND };
    }

    return { message: '' };
}