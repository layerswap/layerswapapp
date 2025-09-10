import { useFormikContext } from "formik";
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import NumericInput from "../NumericInput";
import { useFee } from "../../../context/feeContext";
import useSWRGas from "../../../lib/gases/useSWRGas";
import useSWRBalance from "../../../lib/balances/useSWRBalance";
import { useSwapDataState } from "../../../context/swap";
import MinMax from "./MinMax";
import { resolveMacAllowedAmount } from "./helpers";


const AmountField = forwardRef(function AmountField(_, ref: any) {

    const { values, handleChange } = useFormikContext<SwapFormValues>();
    const [requestedAmountInUsd, setRequestedAmountInUsd] = useState<string>();
    const { fromCurrency, from, to, amount, toCurrency, fromExchange, toExchange } = values || {};
    const { minAllowedAmount, maxAllowedAmount: maxAmountFromApi, fee, isFeeLoading } = useFee()
    const [isFocused, setIsFocused] = useState(false);
    const { selectedSourceAccount } = useSwapDataState()
    const sourceAddress = selectedSourceAccount?.address

    const { balance, isBalanceLoading } = useSWRBalance(sourceAddress, from)
    const { gas, isGasLoading } = useSWRGas(sourceAddress, from, fromCurrency, amount)
    const gasAmount = gas || 0;
    const native_currency = from?.token

    const name = "amount"
    const walletBalance = balance?.find(b => b?.network === from?.name && b?.token === fromCurrency?.symbol)
    let maxAllowedAmount: number = useMemo(() => {
        if (!fromCurrency || !minAllowedAmount || !maxAmountFromApi) return 0
        return resolveMacAllowedAmount({ fromCurrency, limitsMinAmount: minAllowedAmount, limitsMaxAmount: maxAmountFromApi, walletBalance, gasAmount, native_currency })
    }, [fromCurrency, minAllowedAmount, maxAmountFromApi, walletBalance, gasAmount, native_currency])

    const placeholder = (fromCurrency && toCurrency && from && to && minAllowedAmount && !isBalanceLoading && !isGasLoading) ? `${minAllowedAmount} - ${maxAmountFromApi}` : '0.0'
    const step = 1 / Math.pow(10, fromCurrency?.precision || 1)
    const amountRef = useRef(ref)

    const diasbled = Boolean((fromExchange && !toCurrency) || (toExchange && !fromCurrency))

    const updateRequestedAmountInUsd = useCallback((requestedAmount: number, fee) => {
        if (fee?.quote.source_token?.price_in_usd && !isNaN(requestedAmount)) {
            setRequestedAmountInUsd((fee?.quote.source_token?.price_in_usd * requestedAmount).toFixed(2));
        } else {
            setRequestedAmountInUsd(undefined);
        }
    }, [requestedAmountInUsd, fee]);

    useEffect(() => {
        if (isFeeLoading) setRequestedAmountInUsd(undefined)
        else if (fee && amount) updateRequestedAmountInUsd(Number(amount), fee)
    }, [amount, fromCurrency, fee, isFeeLoading])

    return (<>
        <p className="block font-semibold text-secondary-text text-xs mb-1 p-2">Amount</p>
        <div className="flex w-full justify-between bg-secondary-700 rounded-lg">
            <div className="relative w-full">
                <NumericInput
                    disabled={diasbled}
                    placeholder={placeholder}
                    min={minAllowedAmount}
                    max={maxAllowedAmount || 0}
                    step={isNaN(step) ? 0.01 : step}
                    name={name}
                    ref={amountRef}
                    precision={fromCurrency?.precision}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className="text-primary-text pr-0 w-full"
                    onChange={e => {
                        /^[0-9]*[.,]?[0-9]*$/.test(e.target.value) && handleChange(e);
                        updateRequestedAmountInUsd(parseFloat(e.target.value), fee);
                    }}
                >
                    {requestedAmountInUsd && Number(requestedAmountInUsd) > 0 && !isFocused ? (
                        <span className="absolute text-xs right-1 bottom-[16px]">
                            (${requestedAmountInUsd})
                        </span>
                    ) : null}
                </NumericInput>
            </div>
            {
                from && to && fromCurrency && minAllowedAmount && maxAmountFromApi &&
                <MinMax from={from} fromCurrency={fromCurrency} limitsMinAmount={minAllowedAmount} limitsMaxAmount={maxAmountFromApi} />
            }
        </div >
    </>)
});

export default AmountField
