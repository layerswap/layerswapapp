import { useFormikContext } from "formik";
import { forwardRef, useEffect, useRef } from "react";
import { useSettingsState } from "../../context/settings";
import { CalculateMaxAllowedAmount, CalculateMinAllowedAmount } from "../../lib/fees";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import CurrenciesField from "../Select/Currencies";
import NumericInput from "./NumericInput";
import SecondaryButton from "../buttons/secondaryButton";

const AmountField = forwardRef((_, ref: any) => {

    const { values, setFieldValue } = useFormikContext<SwapFormValues>();
    const { networks, currencies } = useSettingsState()
    const { currency, from, to, amount } = values
    const name = "amount"

    useEffect(() => {
        if (amount) {
            setFieldValue(name, minAllowedAmount)
        }
    }, [currency])

    const minAllowedAmount = CalculateMinAllowedAmount(values, networks, currencies);
    const maxAllowedAmount = CalculateMaxAllowedAmount(values, networks);

    const placeholder = currency ? `${minAllowedAmount} - ${maxAllowedAmount}` : '0.01234'
    const step = 1 / Math.pow(10, currency?.baseObject?.precision)
    const amountRef = useRef(ref)

    const amountLabel = (
        <div className="flex items-center space-x-2">
            <p>Amount</p>
            {from && to && amount &&
                <div className="text-xs text-primary-text flex items-center space-x-1">
                    (Min: {minAllowedAmount} - Max: {maxAllowedAmount})
                </div>}
        </div>
    )

    const handleSetMinAmount = () => {
        setFieldValue(name, minAllowedAmount)
    }

    const handleSetMaxAmount = () => {
        setFieldValue(name, maxAllowedAmount)
    }

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
            precision={currency?.baseObject?.precision}
            className="rounded-r-none text-white"
        >
            {
                from && to && currency && < div className="text-xs flex items-center space-x-1 md:space-x-2 ml-2 md:ml-5">
                    <SecondaryButton onClick={handleSetMinAmount} size="xs" className="text-primary-text">
                        MIN
                    </SecondaryButton>
                    <SecondaryButton onClick={handleSetMaxAmount} size="xs" className="text-primary-text">
                        MAX
                    </SecondaryButton>
                </div>
            }
            <CurrenciesField />
        </NumericInput>
    </>)
});
export default AmountField