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
import { useAmountFocus } from "../../../context/amountFocusContext";
import useWindowDimensions from "../../../hooks/useWindowDimensions";

const AmountField = forwardRef(function AmountField(_, ref: any) {

    const { values, handleChange } = useFormikContext<SwapFormValues>();
    const [requestedAmountInUsd, setRequestedAmountInUsd] = useState<string>();
    const { fromCurrency, from, to, amount, toCurrency, fromExchange, toExchange } = values || {};
    const { minAllowedAmount, maxAllowedAmount: maxAmountFromApi, fee, isFeeLoading } = useFee()
    const { isDesktop } = useWindowDimensions();

    const { isAmountFocused, setIsAmountFocused } = useAmountFocus()
    const [focusedFontSize, setFocusedFontSize] = useState("text-[48px]");

    const { selectedSourceAccount } = useSwapDataState()
    const sourceAddress = selectedSourceAccount?.address

    const { balance, isBalanceLoading } = useSWRBalance(sourceAddress, from)
    const { gas, isGasLoading } = useSWRGas(sourceAddress, from, fromCurrency)
    const gasAmount = gas || 0;
    const native_currency = from?.token

    const name = "amount"
    const walletBalance = balance?.find(b => b?.network === from?.name && b?.token === fromCurrency?.symbol)
    let maxAllowedAmount: number = useMemo(() => {
        if (!fromCurrency || !minAllowedAmount || !maxAmountFromApi) return 0
        return resolveMacAllowedAmount({ fromCurrency, limitsMinAmount: minAllowedAmount, limitsMaxAmount: maxAmountFromApi, walletBalance, gasAmount, native_currency })
    }, [fromCurrency, minAllowedAmount, maxAmountFromApi, walletBalance, gasAmount, native_currency])

    const placeholder = (fromCurrency && toCurrency && from && to && minAllowedAmount && !isBalanceLoading && !isGasLoading) ? `${minAllowedAmount} - ${maxAmountFromApi}` : '0'
    const step = 1 / Math.pow(10, fromCurrency?.precision || 1)
    const amountRef = useRef(ref)

    useEffect(() => {
        if (amountRef?.current?.value)
            setIsAmountFocused(true)
    }, [amountRef])

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

    const updateFocusedFontSize = (value: string) => {
        if (!isAmountFocused) return;

        const length = value.replace(/[^0-9.]/g, "").length;
        let size = "text-[48px]";

        if (isDesktop) {
            if (length >= 14) size = "text-[30px]";
            else if (length >= 12) size = "text-[36px]";
            else if (length >= 9) size = "text-[40px]";
        } else {
            if (length >= 14) size = "text-[26px]";
            else if (length >= 12) size = "text-[30px]";
            else if (length >= 10) size = "text-[36px]";
            else if (length >= 8) size = "text-[40px]";
        }

        setFocusedFontSize(size);
    };

    return (<>
        <div className="flex flex-col w-full bg-secondary-500 rounded-lg">
            {
                from && to && fromCurrency && minAllowedAmount && maxAmountFromApi &&
                <MinMax from={from} fromCurrency={fromCurrency} limitsMinAmount={minAllowedAmount} limitsMaxAmount={maxAmountFromApi} />
            }
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
                    onFocus={() => setIsAmountFocused(true)}
                    onBlur={() => {
                        const value = amountRef?.current?.value;
                        if (!value) {
                            setIsAmountFocused(false);
                        }
                    }}
                    className={`${isAmountFocused ? focusedFontSize : "text-[28px]"} text-primary-text px-2 w-full leading-normal focus:outline-none focus:border-none focus:ring-0 transition-all duration-300 ease-in-out !bg-secondary-500`}
                    onChange={e => {
                        /^[0-9]*[.,]?[0-9]*$/.test(e.target.value) && handleChange(e);
                        updateRequestedAmountInUsd(parseFloat(e.target.value), fee);
                        updateFocusedFontSize(e.target.value);
                    }}
                />
                <span className="text-base leading-5 font-medium px-2 text-secondary-text">
                    {`$${requestedAmountInUsd ?? 0}`}
                </span>
            </div>
        </div >
    </>)
});

export default AmountField
