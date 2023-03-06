import { Field, useFormikContext } from "formik";
import { forwardRef, useCallback, useEffect, useState } from "react";
import { useQueryState } from "../context/query";
import { useSettingsState } from "../context/settings";
import { generateSwapInitialValues } from "../lib/generateSwapInitialValues";
import { SwapType } from "../lib/layerSwapApiClient";
import { SwapFormValues } from "./DTOs/SwapFormValues";
import OptionToggle, { NavRadioOption } from "./OptionToggle"

const swapOptions: NavRadioOption[] = [
    { value: SwapType.OnRamp, isEnabled: true, isHighlighted: false },
    { value: SwapType.OffRamp, isEnabled: true, isHighlighted: true },
    { value: SwapType.CrossChain, isEnabled: true, isHighlighted: true }
];

const SwapOptionsToggle = forwardRef((_, ref: any) => {
    const {
        values: { swapType },
        resetForm,
        validateForm
    } = useFormikContext<SwapFormValues>();

    const settings = useSettingsState()
    const query = useQueryState()
    const name = 'swapType'

    const options = query?.products ? swapOptions.filter(so => query?.products.includes(so.value)) : swapOptions

    const handleFieldChange = useCallback((value: SwapType) => {
        const initialValues = generateSwapInitialValues(value, settings, query)
        resetForm({ values: initialValues })
        validateForm(initialValues)
    }, [settings, query])

    return (
        query?.products?.toLowerCase() != SwapType.OffRamp && query?.products?.toLowerCase() != SwapType.OnRamp && query?.products?.toLowerCase() != SwapType.CrossChain &&
        <div ref={ref} tabIndex={0} >
            <Field name={name} value={swapType} items={options} as={OptionToggle} setSelected={handleFieldChange} />
        </div>
    )

})
export default SwapOptionsToggle