import { useFormikContext } from "formik";
import { forwardRef, useRef, useState } from "react";
import { getCurrencyDetails } from "../../helpers/currencyHelper";
import { CalculateMaxAllowedAmount, CalculateMinAllowedAmount } from "../../lib/fees";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import CurrenciesField from "../Select/Currencies";
import NumericInput from "./NumericInput";

const AmountField = forwardRef((props: any, ref: any) => {

    const { values: { currency, swapType, exchange, network } } = useFormikContext<SwapFormValues>();
    const name = "amount"
    const [amount, setAmount] = useState(undefined)

    const minAllowedAmount = CalculateMinAllowedAmount(currency?.baseObject, exchange?.baseObject, network?.baseObject, swapType);
    const maxAllowedAmount = CalculateMaxAllowedAmount(currency?.baseObject, exchange?.baseObject, network?.baseObject, swapType);

    const currencyDetails = getCurrencyDetails(currency?.baseObject, exchange?.baseObject, network?.baseObject, swapType)

    const placeholder = currency ? `${minAllowedAmount} - ${maxAllowedAmount}` : '0.01234'
    const step = 1 / Math.pow(10, currencyDetails?.precision)
    const amountRef = useRef(ref)

    const amountLabel = (
        <div className="flex items-center space-x-2">
            <p>Amount</p>
            {document.activeElement == amountRef?.current &&
                <div className="text-xs text-primary-text flex items-center space-x-1">
                    <button onClick={() => setAmount(minAllowedAmount)} className="py-0.5 px-1 bg-darkblue-600 hover:bg-darkblue-400 rounded-md">
                        Min {minAllowedAmount}
                    </button>
                    <span>-</span>
                    <button onClick={() => setAmount(maxAllowedAmount)} className="py-0.5 px-1 bg-darkblue-600 hover:bg-darkblue-400 rounded-md">
                        Max {maxAllowedAmount}
                    </button>
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
            <CurrenciesField />
        </NumericInput>
    </>)
});
export default AmountField