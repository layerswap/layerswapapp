import { SwapFormValues } from '../components/DTOs/SwapFormValues';
import { isValidAddress } from '../lib/address/validator';

interface Params {
    values: SwapFormValues;
    minAllowedAmount: number | undefined,
    maxAllowedAmount: number | undefined,
    sourceAddress: string | undefined,
    sameAccountNetwork?: string | undefined
}

export function resolveFormValidation({ values, maxAllowedAmount, minAllowedAmount, sourceAddress, sameAccountNetwork }: Params) {
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
    if (values.currencyGroup &&
        (values.fromExchange && !values.from && values.to)) {
        return { message: 'Select withdrawal network' };
    }
    if (values.currencyGroup &&
        !values.to && values.from) {
        return { message: 'Select deposit network' };
    }
    if (values.fromExchange && !values.currencyGroup) {
        return { message: 'Select source asset' };
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
        values.toAsset?.status === 'not_found' ||
        values.currencyGroup?.status === 'not_found'
    ) {
        return { message: `Route unavailable` };
    }

    if (
        values.fromAsset?.status === 'inactive' ||
        values.toAsset?.status === 'inactive' ||
        values.currencyGroup?.status === 'inactive'
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

    return { message: '' };
}