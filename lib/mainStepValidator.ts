import { FormikProps, FormikErrors } from "formik";
import { SwapFormValues } from "../components/DTOs/SwapFormValues";
import roundDecimals from "../components/utils/RoundDecimals";
import { LayerSwapSettings } from "../Models/LayerSwapSettings";
import { isValidAddress } from "./addressValidator";

export default function MainStepValidation(formikRef: React.MutableRefObject<FormikProps<SwapFormValues>>, addressRef: any, settings: LayerSwapSettings, amountRef: any): ((values: SwapFormValues) => void | object | Promise<FormikErrors<SwapFormValues>>) & ((values: SwapFormValues) => FormikErrors<SwapFormValues>) {
    return (values:SwapFormValues) => {
        let errors: FormikErrors<SwapFormValues> = {};
        let amount = Number(values.amount);
        let exchangeMinWithdrawalAmount = values?.currency?.baseObject?.exchanges.find(ce => ce.exchange_id === values?.exchange.baseObject.id).min_withdrawal_amount
        let roundedExchangeMinWithdrawalAmount = exchangeMinWithdrawalAmount  != null ? roundDecimals(exchangeMinWithdrawalAmount, values?.currency?.baseObject.price_in_usdt.toFixed().length) : null;
        let minAllowedAmount = roundedExchangeMinWithdrawalAmount ?? (values.swapType == "onramp" ? values.currency?.baseObject?.min_amount : values.currency?.baseObject.off_ramp_min_amount);
        let maxAllowedAmount = values.swapType == "onramp" ? values.currency?.baseObject?.max_amount : values.currency?.baseObject.off_ramp_max_amount;

        if (!values.exchange) {
            errors.amount = 'Select an exchange';
        }
        else if (!values.network) {
            errors.amount = 'Select a network';
        }
        else if(values.swapType === "onramp"){
            if (!values.destination_address) {
                errors.amount = `Enter ${values?.network?.name} address`;
                if (!formikRef.current.getFieldMeta("destination_address").touched)
                    addressRef?.current?.focus();
            }
            else if (!isValidAddress(values.destination_address, values.network?.baseObject)) {
                errors.amount = `Enter a valid ${values?.network?.name} address`;
                if (!formikRef.current.getFieldMeta("destination_address").touched)
                    addressRef?.current?.focus();
            }
            else if (settings.data.blacklistedAddresses.some(ba => (!ba.network_id || ba.network_id === values.network?.baseObject?.id) && ba.address?.toLocaleLowerCase() === values.destination_address?.toLocaleLowerCase())) {
                errors.amount = `You can not transfer to this address`;
                if (!formikRef.current.getFieldMeta("destination_address").touched)
                    addressRef?.current?.focus();
            }
        }
        else if (!amount) {
            errors.amount = 'Enter an amount';
            if (!formikRef.current.getFieldMeta("amount").touched)
                amountRef?.current?.focus();
        }
        else if (!/^[0-9]*[.,]?[0-9]*$/i.test(amount.toString())) {
            errors.amount = 'Invalid amount';
            if (!formikRef.current.getFieldMeta("amount").touched)
                amountRef?.current?.focus();
        }
        else if (amount < 0) {
            errors.amount = "Can't be negative";
            if (!formikRef.current.getFieldMeta("amount").touched)
                amountRef?.current?.focus();
        }
        else if (amount > maxAllowedAmount) {
            errors.amount = `Max amount is ${maxAllowedAmount}`;
            if (!formikRef.current.getFieldMeta("amount").touched)
                amountRef?.current?.focus();
        }
        else if (amount < minAllowedAmount) {
            errors.amount = `Min amount is ${minAllowedAmount}`;
            if (!formikRef.current.getFieldMeta("amount").touched)
                amountRef?.current?.focus();
        }

        return errors;
    };
}