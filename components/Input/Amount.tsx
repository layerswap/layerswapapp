import { useFormikContext } from "formik";
import { forwardRef, useRef } from "react";
import { getCurrencyDetails } from "../../helpers/currencyHelper";
import { CalculateMaxAllowedAmount, CalculateMinAllowedAmount } from "../../lib/fees";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import CurrenciesField from "../Select/Currencies";
import NumericInput from "./NumericInput";

const AmountField = forwardRef((props: any, ref: any) => {

    const { values: { currency, swapType, exchange, network } } = useFormikContext<SwapFormValues>();
    const name = "amount"

    const minAllowedAmount = CalculateMinAllowedAmount(currency?.baseObject, exchange?.baseObject, network?.baseObject, swapType);
    const maxAllowedAmount = CalculateMaxAllowedAmount(currency?.baseObject, exchange?.baseObject, network?.baseObject, swapType);

    const currencyDetails = getCurrencyDetails(currency?.baseObject, exchange?.baseObject, network?.baseObject, swapType)

    const placeholder = currency ? `${minAllowedAmount} - ${maxAllowedAmount}` : '0.01234'
    const step = 1 / Math.pow(10, currencyDetails?.precision)
    const amountRef = useRef(ref)

    return (<>
        <NumericInput
            label={<p>Amount {document.activeElement == amountRef?.current && <span className="text-xs text-primary-text">({minAllowedAmount} - {maxAllowedAmount})</span>}</p>}
            disabled={!currency}
            placeholder={placeholder}
            min={minAllowedAmount}
            max={maxAllowedAmount}
            step={isNaN(step) ? 0.01 : step}
            name={name}
            ref={amountRef}
            precision={currencyDetails?.precision}
        >
            <CurrenciesField />
        </NumericInput>
    </>)
});
export default AmountField