import { FormikErrors } from "formik";
import { SwapFormValues } from "../components/DTOs/SwapFormValues";
import { BlacklistedAddress } from "../Models/BlacklistedAddress";
import { CryptoNetwork } from "../Models/CryptoNetwork";
import { LayerSwapSettings } from "../Models/LayerSwapSettings";
import { isValidAddress } from "./addressValidator";
import { CalculateMaxAllowedAmount, CalculateMinAllowedAmount } from "./fees";
import { SwapType } from "./layerSwapApiClient";

export default function MainStepValidation(settings: LayerSwapSettings): ((values: SwapFormValues) => FormikErrors<SwapFormValues>) {
    return (values: SwapFormValues) => {
        let errors: FormikErrors<SwapFormValues> = {};
        let amount = Number(values.amount);
        let minAllowedAmount = CalculateMinAllowedAmount(values, settings.networks);
        let maxAllowedAmount = CalculateMaxAllowedAmount(values, settings.networks);

        if (!values.exchange) {
            (errors.exchange as any) = 'Select an exchange';
        }
        if (!values.network) {
            (errors.network as any) = 'Select a network';
        }
        if (!amount) {
            errors.amount = 'Enter an amount';
        }
        if (!/^[0-9]*[.,]?[0-9]*$/i.test(amount.toString())) {
            errors.amount = 'Invalid amount';
        }
        if (amount < 0) {
            errors.amount = "Can't be negative";
        }
        if (maxAllowedAmount != undefined && amount > maxAllowedAmount) {
            errors.amount = `Max amount is ${maxAllowedAmount}`;
        }
        if (minAllowedAmount != undefined && amount < minAllowedAmount) {
            errors.amount = `Min amount is ${minAllowedAmount}`;
        }
        if (values.swapType === SwapType.OnRamp && values.network) {
            if (!values.destination_address) {
                errors.destination_address = `Enter ${values.network.name} address`;
            }
            else if (!isValidAddress(values.destination_address, values.network.baseObject)) {
                errors.destination_address = `Enter a valid ${values.network.name} address`;
            }
            else if (isBlacklistedAddress(settings.blacklisted_addresses, values.network.baseObject, values.destination_address)) {
                errors.destination_address = `You can not transfer to this address`;
            }
        }
        else if (values.swapType === SwapType.OffRamp && values.exchange) {
            if (!values.destination_address) {
                errors.destination_address = `Enter ${values.exchange.name} address`;
            }
            else if (!isValidAddress(values.destination_address, values.exchange?.baseObject)) {
                errors.destination_address = `Enter a valid ${values.exchange.name} address`;
            }
        }
        
        if (Object.keys(errors).length === 0) return errors

        if (Object.keys(errors).length === 0) return errors

        const errorsOrder: FormikErrors<SwapFormValues> = {
            [values.swapType === SwapType.OnRamp ? "exchange" : "network"]: null
        }
        return Object.assign(errorsOrder, errors);
    };
}
function isBlacklistedAddress(blacklisted_addresses: BlacklistedAddress[], network: CryptoNetwork, address: string) {
    return blacklisted_addresses?.some(ba => (!ba.network || ba.network === network?.internal_name) && ba.address?.toLowerCase() === address?.toLowerCase());
}
