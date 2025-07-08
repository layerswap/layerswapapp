import { useFormikContext } from "formik";
import { forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import NumericInput from "../NumericInput";
import useSWRGas from "@/lib/gases/useSWRGas";
import useSWRBalance from "@/lib/balances/useSWRBalance";
import { useSwapDataState } from "@/context/swap";
import { resolveMaxAllowedAmount } from "./helpers";
import { useQuoteData } from "@/hooks/useFee";

const AmountField = forwardRef(function AmountField(_, ref: any) {
    const { values, handleChange } = useFormikContext<SwapFormValues>();
    const [requestedAmountInUsd, setRequestedAmountInUsd] = useState<string>();
    const { fromAsset: fromCurrency, from, amount, toAsset: toCurrency, fromExchange } = values || {};
    const { minAllowedAmount, maxAllowedAmount: maxAmountFromApi, quote: fee } = useQuoteData(values)
    const name = "amount"
    const amountRef = useRef(ref)
    const suffixRef = useRef<HTMLSpanElement>(null);

    useLayoutEffect(() => {
        const input = amountRef.current;
        const suffix = suffixRef.current;

        if (!input || !suffix) return;

        const font = getFontFromElement(input);
        const width = getTextWidth(input.value || "0", font);

        suffix.style.left = `${width + 20}px`;
    }, [amount, requestedAmountInUsd]);

    const { selectedSourceAccount } = useSwapDataState()
    const sourceAddress = selectedSourceAccount?.address

    const { balances } = useSWRBalance(sourceAddress, from)
    const { gas } = useSWRGas(sourceAddress, from, fromCurrency)
    const gasAmount = gas || 0;
    const native_currency = from?.token

    const walletBalance = balances?.find(b => b?.network === from?.name && b?.token === fromCurrency?.symbol)
    let maxAllowedAmount: number = useMemo(() => {
        if (!fromCurrency || !minAllowedAmount || !maxAmountFromApi) return 0
        return resolveMaxAllowedAmount({ fromCurrency, limitsMinAmount: minAllowedAmount, limitsMaxAmount: maxAmountFromApi, walletBalance, gasAmount, native_currency })
    }, [fromCurrency, minAllowedAmount, maxAmountFromApi, walletBalance, gasAmount, native_currency])

    const placeholder = '0'
    const step = 1 / Math.pow(10, fromCurrency?.precision || 1)

    const disabled = Boolean(fromExchange && !toCurrency)

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
            <div className={`relative w-full group-[.exchange-amount-field]:pb-2 group focus-within:[&_.usd-suffix]:invisible`}>
                <NumericInput
                    disabled={disabled}
                    placeholder={placeholder}
                    min={minAllowedAmount}
                    max={maxAllowedAmount || 0}
                    step={isNaN(step) ? 0.01 : step}
                    name={name}
                    ref={amountRef}
                    precision={fromCurrency?.precision}
                    className="w-full text-[28px] text-primary-text placeholder:!text-primary-text leading-normal focus:outline-none focus:border-none focus:ring-0 transition-all duration-300 ease-in-out !bg-secondary-500 !font-normal group-[.exchange-amount-field]:px-4 group-[.exchange-amount-field]:pb-2 group-[.exchange-amount-field]:pr-2 group-[.exchange-amount-field]:bg-secondary-300! pl-0"
                    onChange={e => {
                        /^[0-9]*[.,]?[0-9]*$/.test(e.target.value) && handleChange(e);
                        updateRequestedAmountInUsd(parseFloat(e.target.value), fromCurrencyPriceInUsd);
                    }}
                />
                <span className="usd-suffix text-base font-medium text-secondary-text pointer-events-none group-[.exchange-amount-field]:absolute group-[.exchange-amount-field]:bottom-4" ref={suffixRef}>
                    ${requestedAmountInUsd ?? "0"}
                </span>
            </div>
        </div>
    </>)
});

export default AmountField

function getTextWidth(text: string = '', font: string): number {
    if (typeof document === "undefined") return 0;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return 0;

    context.font = font;
    return context.measureText(text).width;
}

function getFontFromElement(el: HTMLElement | null): string {
    if (!el) return '28px sans-serif';
    const style = window.getComputedStyle(el);
    return `${style.fontSize} ${style.fontFamily}`;
}