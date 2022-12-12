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

        if (!values.exchange) {
            (errors.exchange as any) = 'Select an exchange';
        }
        if (!values.network) {
            (errors.network as any) = 'Select a network';
        }
        if (values.swapType === SwapType.OnRamp && values.network)
        {
            if (!values.destination_address)
            {
                errors.destination_address = `Enter ${values.network.name} address`;
            }
            else if (!isValidAddress(values.destination_address, values.network.baseObject))
            {
                errors.destination_address = `Enter a valid ${values.network.name} address`;
            }
            else if (isBlacklistedAddress(settings.blacklisted_addresses, values.network.baseObject, values.destination_address))
            {
                errors.destination_address = `You can not transfer to this address`;
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
//TODO match blacklisted addresses
function isBlacklistedAddress(blacklisted_addresses: BlacklistedAddress[], network: CryptoNetwork, address: string) {
    return false ///blacklisted_addresses?.some(ba => (!ba.network_id || ba.network_id === network?.id) && ba.address?.toLowerCase() === address?.toLowerCase());
}

