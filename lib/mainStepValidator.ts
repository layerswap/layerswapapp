import { FormikErrors } from "formik";
import { SwapFormValues } from "../components/DTOs/SwapFormValues";
import { isValidAddress } from "./address/validator";

export default function MainStepValidation({ maxAllowedAmount, minAllowedAmount, sourceAddress, sameAccountNetwork }: { minAllowedAmount: number | undefined, maxAllowedAmount: number | undefined, sourceAddress: string | undefined, sameAccountNetwork?: string | undefined }): ((values: SwapFormValues) => FormikErrors<SwapFormValues>) {
    return (values: SwapFormValues) => {
        let errors: FormikErrors<SwapFormValues> = {};
        let amount = values.amount ? Number(values.amount) : undefined;

        if (!values.from && !values.fromExchange) {
            errors.from = 'Select source';
        }
        if (!values.to && !values.toExchange) {
            errors.to = 'Select destination';
        }
        if (!values.fromCurrency) {
            errors.fromCurrency = 'Select source asset';
        }
        if (!values.toCurrency) {
            errors.toCurrency = 'Select destination asset';
        }
        if (values.currencyGroup &&
            (values.fromExchange && !values.from)) {
            errors.from = 'Select withdrawal network';
        }
        if (values.currencyGroup &&
            values.toExchange && !values.to) {
            errors.to = 'Select deposit network';
        }
        if (values.fromExchange && !values.currencyGroup) {
            errors.currencyGroup = 'Select source asset'
        }
        if (values.toExchange && !values.currencyGroup) {
            errors.currencyGroup = 'Select destination asset'
        }
        if (!amount) {
            errors.amount = 'Enter an amount';
        }
        if (amount && !/^[0-9]*[.,]?[0-9]*$/i.test(amount.toString())) {
            errors.amount = 'Invalid amount';
        }
        if (amount && amount < 0) {
            errors.amount = "Can't be negative";
        }
        if (maxAllowedAmount != undefined && (amount && amount > maxAllowedAmount)) {
            errors.amount = `Max amount is ${maxAllowedAmount}`;
        }
        if (minAllowedAmount != undefined && (amount && amount < minAllowedAmount)) {
            errors.amount = `Min amount is ${minAllowedAmount}`;
        }
        if (values.to) {
            if (!values.destination_address) {
                errors.destination_address = `Enter Destination address`;
            }
            else if (!isValidAddress(values.destination_address, values.to)) {
                errors.destination_address = `Enter a valid ${values.to?.display_name} address`;
            }
        }
        if (values.fromCurrency?.status === 'not_found' || values.toCurrency?.status === 'not_found' || values.currencyGroup?.status === 'not_found') {
            errors.amount = `Route unavailable`;
        }
        if (values.fromCurrency?.status === 'inactive' || values.toCurrency?.status === 'inactive' || values.currencyGroup?.status === 'inactive') {
            errors.amount = `Route unavailable`;
        }
        if ((values.from?.name.toLowerCase() === sameAccountNetwork?.toLowerCase() || values.to?.name.toLowerCase() === sameAccountNetwork?.toLowerCase())) {

            if ((sourceAddress && values.destination_address && sourceAddress.toLowerCase() !== values.destination_address?.toLowerCase())) {
                errors.destination_address = `Address update required`;
            }
            if (values.depositMethod === "deposit_address") {
                errors.destination_address = 'Manual Transfer is not supported';
            }

        }

        return errors;
    };
}
