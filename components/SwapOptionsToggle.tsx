import { Field, useFormikContext } from "formik";
import { FC, forwardRef, useState } from "react";
import { SwapFormValues } from "./DTOs/SwapFormValues";
import OptionToggle, { NavRadioOption } from "./OptionToggle"

const swapOptions: NavRadioOption[] = [
    { value: "onramp", displayName: 'Exchange -> L2', isEnabled: true },
    { value: "offramp", displayName: 'L2 -> Exchange', isEnabled: true }
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
        <Field name={name} placeholder="Choose exchange" value={swapType} items={swapOptions} as={OptionToggle} setSelected={handleFieldChange} />
    </div>
})
export default SwapOptionsToggle