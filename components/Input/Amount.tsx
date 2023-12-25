import { useFormikContext } from "formik";
import { forwardRef } from "react";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import NumericInput from "./NumericInput";
import dynamic from "next/dynamic";

const EnhancedAmountField = dynamic(() => import("./EnhancedAmount"), {
    loading: () => <NumericInput
        label={<div className="flex items-center w-full justify-between">
            <div className="flex items-center space-x-2">
                <p>Amount</p>
            </div>
        </div>}
        disabled={true}
        placeholder='0.01234'
        name="amount"
        className="rounded-r-none text-primary-text"
    >
    </NumericInput>
});

const AmountField = forwardRef(function AmountField(_, ref: any) {

    const { values } = useFormikContext<SwapFormValues>();
    const { from, to } = values
    const name = "amount"

    if (!from || !to)
        return <NumericInput
            label={<div className="flex items-center w-full justify-between">
                <div className="flex items-center space-x-2">
                    <p>Amount</p>
                </div>
            </div>}
            disabled={true}
            placeholder='0.01234'
            name={name}
            className="rounded-r-none text-primary-text"
        >
        </NumericInput>

    return <EnhancedAmountField />
});


export default AmountField