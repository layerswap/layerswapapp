import { FormikProps, FormikErrors } from "formik";
import { SwapFormValues } from "../components/DTOs/SwapFormValues";
import { LayerSwapSettings } from "../Models/LayerSwapSettings";
import { isValidAddress } from "./addressValidator";
import { CalculateMaxAllowedAmount, CalculateMinAllowedAmount } from "./fees";

export default function MainStepValidation(settings: LayerSwapSettings): ((values: SwapFormValues) => FormikErrors<SwapFormValues>) {
    return (values: SwapFormValues) => {
        let errors: FormikErrors<SwapFormValues> = {};
        let amount = Number(values.amount);
        let minAllowedAmount = CalculateMinAllowedAmount(values?.currency?.baseObject, values?.exchange?.baseObject, values?.swapType);
        let maxAllowedAmount = CalculateMaxAllowedAmount(values?.currency?.baseObject, values?.swapType);

        if (!values.exchange) {
            (errors.exchange as any) = 'Select an exchange';
        }
        else if (!values.network) {
            (errors.network as any) = 'Select a network';
        }
        else if (values.swapType === "onramp" && !values.destination_address) {
            errors.destination_address = `Enter ${values?.network?.name} address`;
        }
        else if (values.swapType === "onramp" && !isValidAddress(values.destination_address, values.network?.baseObject)) {
            errors.destination_address = `Enter a valid ${values?.network?.name} address`;
        }
        else if (values.swapType === "onramp" && settings.data.blacklistedAddresses.some(ba => (!ba.network_id || ba.network_id === values.network?.baseObject?.id) && ba.address?.toLocaleLowerCase() === values.destination_address?.toLocaleLowerCase())) {
            errors.destination_address = `You can not transfer to this address`;
        }
        else if (!amount) {
            errors.amount = 'Enter an amount';
        }
        else if (!/^[0-9]*[.,]?[0-9]*$/i.test(amount.toString())) {
            errors.amount = 'Invalid amount';
        }
        else if (amount < 0) {
            errors.amount = "Can't be negative";
        }
        else if (maxAllowedAmount != undefined && amount > maxAllowedAmount) {
            errors.amount = `Max amount is ${maxAllowedAmount}`;
        }
        else if (minAllowedAmount != undefined && amount < minAllowedAmount) {
            errors.amount = `Min amount is ${minAllowedAmount}`;
        }

        return errors;
    };
}