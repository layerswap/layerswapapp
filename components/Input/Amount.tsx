import { useFormikContext } from "formik";
import { forwardRef, useRef } from "react";
import { useSettingsState } from "../../context/settings";
import { CalculateMaxAllowedAmount, CalculateMinAllowedAmount } from "../../lib/fees";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import CurrencyFormField from "./CurrencyFormField";
import NumericInput from "./NumericInput";
import SecondaryButton from "../buttons/secondaryButton";
import { useQueryState } from "../../context/query";

const AmountField = forwardRef((_, ref: any) => {

    const { values, setFieldValue } = useFormikContext<SwapFormValues>();
    const { networks, currencies } = useSettingsState()
    const query = useQueryState();
    const { currency, from, to, amount } = values
    const name = "amount"

    const minAllowedAmount = CalculateMinAllowedAmount(values, networks, currencies);
    const maxAllowedAmount = CalculateMaxAllowedAmount(values, query.balances, minAllowedAmount);

    const placeholder = (currency && from && to) ? `${minAllowedAmount} - ${maxAllowedAmount}` : '0.01234'
    const step = 1 / Math.pow(10, currency?.precision)
    const amountRef = useRef(ref)

    const handleSetMinAmount = () => {
        setFieldValue(name, minAllowedAmount)
    }

    const handleSetMaxAmount = () => {
        setFieldValue(name, maxAllowedAmount)
    }

    return (<>
        <NumericInput
            label={<AmountLabel detailsAvailable={!!(from && to && amount)}
                maxAllowedAmount={maxAllowedAmount}
                minAllowedAmount={minAllowedAmount}
            />}
            disabled={!currency}
            placeholder={placeholder}
            min={minAllowedAmount}
            max={maxAllowedAmount}
            step={isNaN(step) ? 0.01 : step}
            name={name}
            ref={amountRef}
            precision={currency?.precision}
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
            <CurrencyFormField />
        </NumericInput>
    </>)
});
type AmountLabelProps = {
    detailsAvailable: boolean;
    minAllowedAmount: number;
    maxAllowedAmount: number;
}
const AmountLabel = ({
    detailsAvailable,
    minAllowedAmount,
    maxAllowedAmount
}: AmountLabelProps) => {
    return <div className="flex items-center space-x-2">
        <p>Amount</p>
        {detailsAvailable &&
            <div className="text-xs text-primary-text flex items-center space-x-1">
                (Min: {minAllowedAmount} - Max: {maxAllowedAmount})
            </div>}
    </div>
}

export default AmountField