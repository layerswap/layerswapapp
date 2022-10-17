import { Web3Provider } from "@ethersproject/providers";
import { useWeb3React } from "@web3-react/core";
import { Field, useFormikContext } from "formik";
import { forwardRef, useCallback } from "react";
import { useQueryState } from "../context/query";
import { useSettingsState } from "../context/settings";
import { generateSwapInitialValues } from "../lib/generateSwapInitialValues";
import { SwapType } from "../lib/layerSwapApiClient";
import { SwapFormValues } from "./DTOs/SwapFormValues";
import OptionToggle, { NavRadioOption } from "./OptionToggle"

const swapOptions: NavRadioOption[] = [
    { value: SwapType.OnRamp, isEnabled: true, isHighlighted: false },
    { value: SwapType.OffRamp, isEnabled: true, isHighlighted: true }
];

const SwapOptionsToggle = forwardRef((props, ref: any) => {
    const {
        values: { swapType },
        setFieldValue,
        resetForm,
        validateForm
    } = useFormikContext<SwapFormValues>();
    const { account, chainId } = useWeb3React<Web3Provider>();

    const settings = useSettingsState()
    const query = useQueryState()
    const name = 'swapType'

    const initialValues = generateSwapInitialValues(swapType, settings, query, account, chainId)
    
    const handleFieldChange = useCallback((value: SwapType) => {
        const initialValues = generateSwapInitialValues(value, settings, query, account, chainId)
        resetForm({ values: initialValues })
        validateForm(initialValues)
    }, [account, chainId, settings,])

    return (
        query?.products?.toLowerCase() != SwapType.OffRamp && query?.products?.toLowerCase() != SwapType.OnRamp &&
        <div ref={ref} tabIndex={0} >
            <Field name={name} value={swapType} items={swapOptions} as={OptionToggle} setSelected={handleFieldChange} />
        </div>
    )

})
export default SwapOptionsToggle