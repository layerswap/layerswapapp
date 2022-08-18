import { FormikProps, FormikErrors } from "formik";
import { SwapFormValues } from "../components/DTOs/SwapFormValues";
import { LayerSwapSettings } from "../Models/LayerSwapSettings";
import { isValidAddress } from "./addressValidator";
import { CalculateMaxAllowedAmount, CalculateMinAllowedAmount } from "./fees";

export default function MainStepValidation(formikRef: React.MutableRefObject<FormikProps<SwapFormValues>>, addressRef: any, settings: LayerSwapSettings, amountRef: any): ((values: SwapFormValues) => void | object | Promise<FormikErrors<SwapFormValues>>) & ((values: SwapFormValues) => FormikErrors<SwapFormValues>) {
    return (values: SwapFormValues) => {
        if (values.swapType === "onramp" && formikRef.current.errors.destination_address) {
            if (!formikRef.current.getFieldMeta("destination_address").touched)
                addressRef?.current?.focus();
        }

        if (formikRef.current.errors.amount) {
            if (!formikRef.current.getFieldMeta("amount").touched)
                addressRef?.current?.focus();
        }
        return formikRef.current.errors
    };
}