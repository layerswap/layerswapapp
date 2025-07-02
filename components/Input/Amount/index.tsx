import { useFormikContext } from "formik";
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import NumericInput from "../NumericInput";
import { useQuote } from "@/context/feeContext";
import useSWRGas from "@/lib/gases/useSWRGas";
import useSWRBalance from "@/lib/balances/useSWRBalance";
import { useSwapDataState } from "@/context/swap";
import { resolveMaxAllowedAmount } from "./helpers";

const AmountField = forwardRef(function AmountField(_, ref: any) {
    const { values, handleChange } = useFormikContext<SwapFormValues>();
    const [requestedAmountInUsd, setRequestedAmountInUsd] = useState<string>();
    const { fromAsset: fromCurrency, from, amount, toAsset: toCurrency, fromExchange } = values || {};
    const { minAllowedAmount, maxAllowedAmount: maxAmountFromApi, quote: fee } = useQuote()

    const { selectedSourceAccount } = useSwapDataState()
    const sourceAddress = selectedSourceAccount?.address

    const { balances } = useSWRBalance(sourceAddress, from)
    const { gas } = useSWRGas(sourceAddress, from, fromCurrency)
    const gasAmount = gas || 0;
    const native_currency = from?.token

    const name = "amount"
    const walletBalance = balances?.find(b => b?.network === from?.name && b?.token === fromCurrency?.symbol)
    let maxAllowedAmount: number = useMemo(() => {
        if (!fromCurrency || !minAllowedAmount || !maxAmountFromApi) return 0
        return resolveMaxAllowedAmount({ fromCurrency, limitsMinAmount: minAllowedAmount, limitsMaxAmount: maxAmountFromApi, walletBalance, gasAmount, native_currency })
    }, [fromCurrency, minAllowedAmount, maxAmountFromApi, walletBalance, gasAmount, native_currency])

    const placeholder = '0'
    const step = 1 / Math.pow(10, fromCurrency?.precision || 1)
    const amountRef = useRef(ref)

    const diasbled = Boolean(fromExchange && !toCurrency)

    const updateRequestedAmountInUsd = useCallback((requestedAmount: number, price_in_usd: number | undefined) => {
        if (price_in_usd && !isNaN(requestedAmount)) {
            setRequestedAmountInUsd((price_in_usd * requestedAmount).toFixed(2));
        } else if (isNaN(requestedAmount) || requestedAmount <= 0) {
            setRequestedAmountInUsd(undefined);
        }
    }, [requestedAmountInUsd, fee]);

    const fromCurrencyPriceInUsd = fee?.quote.source_token?.price_in_usd || fromCurrency?.price_in_usd;

    useEffect(() => {
        if (fee && amount) updateRequestedAmountInUsd(Number(amount), fromCurrencyPriceInUsd)
    }, [amount, fromCurrency, fee])


    return (<>
        <div className="flex flex-col w-full bg-secondary-500 rounded-lg">
            <div className="relative w-full in-has-[.exchange-amount-field]:pb-2">
                <NumericInput
                    disabled={diasbled}
                    placeholder={placeholder}
                    min={minAllowedAmount}
                    max={maxAllowedAmount || 0}
                    step={isNaN(step) ? 0.01 : step}
                    name={name}
                    ref={amountRef}
                    precision={fromCurrency?.precision}
                    className="w-full text-[28px] text-primary-text placeholder:!text-primary-text leading-normal focus:outline-none focus:border-none focus:ring-0 transition-all duration-300 ease-in-out !bg-secondary-500 !font-normal in-has-[.exchange-amount-field]:px-2 in-has-[.exchange-amount-field]:pb-2 in-has-[.exchange-amount-field]:pr-2 pl-0"
                    onChange={e => {
                        /^[0-9]*[.,]?[0-9]*$/.test(e.target.value) && handleChange(e);
                        updateRequestedAmountInUsd(parseFloat(e.target.value), fromCurrencyPriceInUsd);
                    }}
                />
                <span className="text-base leading-5 font-medium text-secondary-text in-has-[.exchange-amount-field]:px-2">
                    {`$${requestedAmountInUsd ?? 0}`}
                </span>
            </div>
        </div>
    </>)
});

export default AmountField
