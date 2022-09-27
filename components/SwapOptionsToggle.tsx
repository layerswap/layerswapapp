import { Field, useFormikContext } from "formik";
import { FC, forwardRef, useCallback, useState } from "react";
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
        resetForm,
    } = useFormikContext<SwapFormValues>();

    const settings = useSettingsState()
    const query = useQueryState()
    const name = 'swapType'

    const handleFieldChange = (value: SwapType) => {
        const initialValues = generateSwapInitialValues(value, settings, query)

        resetForm({ values: initialValues })
    }

    return <div ref={ref} tabIndex={0} >
        <Field name={name} value={swapType} items={swapOptions} as={OptionToggle} setSelected={handleFieldChange} />
    </div>
})
export default SwapOptionsToggle