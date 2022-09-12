import { useFormikContext } from "formik";
import { forwardRef } from "react";
import { CalculateMaxAllowedAmount, CalculateMinAllowedAmount } from "../../lib/fees";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import CurrenciesField from "../Select/Currencies";
import NumericInput from "./NumericInput";

const AmountField = forwardRef((props: any, ref: any) => {

    const { values: { currency, swapType, exchange } } = useFormikContext<SwapFormValues>();
    const name = "amount"
    let minAllowedAmount = CalculateMinAllowedAmount(currency?.baseObject, exchange?.baseObject, swapType);
    let maxAllowedAmount = CalculateMaxAllowedAmount(currency?.baseObject, exchange?.baseObject, swapType);

    const placeholder = currency ? `${minAllowedAmount} - ${maxAllowedAmount}` : '0.01234'
    const step = 1 / Math.pow(10, currency?.baseObject?.decimals)

    return (<>
        <NumericInput
            label='Amount'
            disabled={!currency}
            placeholder={placeholder}
            min={minAllowedAmount}
            max={maxAllowedAmount}
            step={isNaN(step) ? 0.01 : step}
            name={name}
            ref={ref}
            precision={currency?.baseObject.precision}
        >
            <CurrenciesField />
        </NumericInput>
    </>)
});
export default AmountField