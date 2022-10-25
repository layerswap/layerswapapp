import { useFormikContext } from "formik";
import { forwardRef, useRef, useState } from "react";
import { getCurrencyDetails } from "../../helpers/currencyHelper";
import { CalculateMaxAllowedAmount, CalculateMinAllowedAmount } from "../../lib/fees";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import CurrenciesField from "../Select/Currencies";
import NumericInput from "./NumericInput";

const AmountField = forwardRef((props: any, ref: any) => {

    const { values: { currency, swapType, exchange, network, amount }, setFieldValue } = useFormikContext<SwapFormValues>();
    const name = "amount"

    const minAllowedAmount = CalculateMinAllowedAmount(currency?.baseObject, exchange?.baseObject, network?.baseObject, swapType);
    const maxAllowedAmount = CalculateMaxAllowedAmount(currency?.baseObject, exchange?.baseObject, network?.baseObject, swapType);

    const currencyDetails = getCurrencyDetails(currency?.baseObject, exchange?.baseObject, network?.baseObject, swapType)

    const placeholder = currency ? `${minAllowedAmount} - ${maxAllowedAmount}` : '0.01234'
    const step = 1 / Math.pow(10, currencyDetails?.precision)
    const amountRef = useRef(ref)

    const amountLabel = (
        <div className="flex items-center space-x-2">
            <p>Amount</p>
            {amount &&
                <div className="text-xs text-primary-text flex items-center space-x-1">
                    (Min: {minAllowedAmount} - Max: {maxAllowedAmount})
                </div>}
        </div>
    )

    return (<>
        <NumericInput
            label={amountLabel}
            disabled={!currency}
            placeholder={placeholder}
            min={minAllowedAmount}
            max={maxAllowedAmount}
            step={isNaN(step) ? 0.01 : step}
            name={name}
            ref={amountRef}
            precision={currencyDetails?.precision}
        >
            {amount && < div className="text-xs flex items-center space-x-2 ml-3 md:ml-5">
                <button
                    type="button"
                    className="p-1.5  bg-darkblue-400 hover:bg-darkblue-300 rounded-md hidden md:block border border-darkblue-400 hover:border-darkblue-100"
                    onClick={() => setFieldValue(name, minAllowedAmount)}

                >
                    MIN
                </button>
                <button
                    type="button"
                    onClick={() => setFieldValue(name, maxAllowedAmount)}
                    className="p-1.5  bg-darkblue-400 hover:bg-darkblue-300 rounded-md border border-darkblue-400 hover:border-darkblue-100">
                    MAX
                </button>
            </div>}
            <CurrenciesField />
        </NumericInput>
    </>)
});
export default AmountField