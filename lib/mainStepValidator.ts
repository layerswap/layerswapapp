import { FormikProps, FormikErrors } from "formik";
import { SwapFormValues } from "../components/DTOs/SwapFormValues";
import { LayerSwapSettings } from "../Models/LayerSwapSettings";
import { isValidAddress } from "./addressValidator";
import { CalculateMaxAllowedAmount, CalculateMinAllowedAmount } from "./fees";

export default function MainStepValidation(formikRef: React.MutableRefObject<FormikProps<SwapFormValues>>, addressRef: any, settings: LayerSwapSettings, amountRef: any): ((values: SwapFormValues) => void | object | Promise<FormikErrors<SwapFormValues>>) & ((values: SwapFormValues) => FormikErrors<SwapFormValues>) {
    return (values: SwapFormValues) => {
        let errors: FormikErrors<SwapFormValues> = {};
        let amount = Number(values.amount);
        let minAllowedAmount = CalculateMinAllowedAmount(values?.currency?.baseObject, values?.exchange?.baseObject, values?.swapType);
        let maxAllowedAmount = CalculateMaxAllowedAmount(values?.currency?.baseObject, values?.swapType);

        if (!values.exchange) {
            errors.amount = 'Select an exchange';
        }
        else if (!values.network) {
            errors.amount = 'Select a network';
        }
        else if (values.swapType === "onramp" && !values.destination_address) {
            errors.amount = `Enter ${values?.network?.name} address`;
            if (!formikRef.current.getFieldMeta("destination_address").touched)
                addressRef?.current?.focus();
        }
        else if (values.swapType === "onramp" && !isValidAddress(values.destination_address, values.network?.baseObject)) {
            errors.amount = `Enter a valid ${values?.network?.name} address`;
            if (!formikRef.current.getFieldMeta("destination_address").touched)
                addressRef?.current?.focus();
        }
        else if (values.swapType === "onramp" && settings.data.blacklistedAddresses.some(ba => (!ba.network_id || ba.network_id === values.network?.baseObject?.id) && ba.address?.toLocaleLowerCase() === values.destination_address?.toLocaleLowerCase())) {
            errors.amount = `You can not transfer to this address`;
            if (!formikRef.current.getFieldMeta("destination_address").touched)
                addressRef?.current?.focus();
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