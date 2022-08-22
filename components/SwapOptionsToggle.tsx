import { Field, useFormikContext } from "formik";
import { FC, forwardRef, useState } from "react";
import { SwapFormValues } from "./DTOs/SwapFormValues";
import OptionToggle, { NavRadioOption } from "./OptionToggle"

const swapOptions: NavRadioOption[] = [
    { value: "onramp", isEnabled: true, isHighlighted: false },
    { value: "offramp", isEnabled: true, isHighlighted: true }
];

const SwapOptionsToggle = forwardRef((props, ref: any) => {
    const {
        values: { swapType },
        setFieldValue,
        resetForm,
    } = useFormikContext<SwapFormValues>();
    const name = 'swapType'

    const handleFieldChange = (value: string) => {
        resetForm()
        setFieldValue(name, value)
    }
    return <div ref={ref} tabIndex={0} >
        <Field name={name} value={swapType} items={swapOptions} as={OptionToggle} setSelected={handleFieldChange} />
    </div>
})
export default SwapOptionsToggle