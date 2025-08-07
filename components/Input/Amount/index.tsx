import { useFormikContext } from "formik";
import { forwardRef, useEffect, useMemo, useRef } from "react";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import NumericInput from "../NumericInput";
import useSWRGas from "@/lib/gases/useSWRGas";
import useSWRBalance from "@/lib/balances/useSWRBalance";
import { resolveMaxAllowedAmount } from "./helpers";
import { transformFormValuesToQuoteArgs, useQuoteData } from "@/hooks/useFee";
import { truncateDecimals } from "@/components/utils/RoundDecimals";
import useWallet from "@/hooks/useWallet";
import { formatUsd } from "@/components/utils/formatUsdAmount";

interface AmountFieldProps {
    usdPosition?: "right" | "bottom";
    onAmountFocus?: () => void;
    onAmountBlur?: () => void;
}

const AmountField = forwardRef(function AmountField({ usdPosition = "bottom", onAmountFocus, onAmountBlur }: AmountFieldProps, ref: any) {
    const { values, handleChange } = useFormikContext<SwapFormValues>();
    const { fromAsset: fromCurrency, from, amount, toAsset: toCurrency, fromExchange } = values || {};
    const { provider } = useWallet(values.from, "withdrawal")
    const selectedSourceAccount = useMemo(() => provider?.activeWallet, [provider]);
    const quoteArgs = useMemo(() => transformFormValuesToQuoteArgs(values), [values]);
    const { minAllowedAmount, maxAllowedAmount: maxAmountFromApi, quote: fee } = useQuoteData(quoteArgs)
    const name = "amount"
    const amountRef = useRef(ref)
    const suffixRef = useRef<HTMLDivElement>(null);

    const sourceCurrencyPriceInUsd = fee?.quote.source_token?.price_in_usd || fromCurrency?.price_in_usd;

    const requestedAmountInUsd = useMemo(() => {
        const amountNumber = Number(amount);
        if (isNaN(amountNumber) || amountNumber <= 0 || !sourceCurrencyPriceInUsd)
            return undefined;
        return formatUsd(sourceCurrencyPriceInUsd * amountNumber)
    }, [amount, sourceCurrencyPriceInUsd]);

    useEffect(() => {
        const input = amountRef.current;
        const suffix = suffixRef.current;

        if (!input || !suffix) return;

        const font = getFontFromElement(input);
        const width = getTextWidth(input.value || "0", font);

        suffix.style.left = `${width + 16}px`;
    }, [amount, requestedAmountInUsd]);

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

    return (<>
        <div className="flex flex-col w-full bg-secondary-500 rounded-lg">
            <div className={`relative w-full group-[.exchange-amount-field]:pb-2 group ${usdPosition === "right" ? "focus-within:[&_.usd-suffix]:invisible" : ""}`}>
                <NumericInput
                    disabled={disabled}
                    placeholder={placeholder}
                    min={minAllowedAmount}
                    max={Number(truncateDecimals(maxAllowedAmount, fromCurrency?.precision)) || 0}
                    onFocus={onAmountFocus}
                    onBlur={onAmountBlur}
                    step={isNaN(step) ? 0.01 : step}
                    name={name}
                    ref={amountRef}
                    precision={fromCurrency?.precision}
                    className="w-full text-[28px] text-primary-text placeholder:!text-primary-text leading-normal focus:outline-none focus:border-none focus:ring-0 transition-all duration-300 ease-in-out !bg-secondary-500 !font-normal group-[.exchange-amount-field]:px-2.5 group-[.exchange-amount-field]:pb-2 group-[.exchange-amount-field]:pr-2 group-[.exchange-amount-field]:bg-secondary-300! pl-0"
                    onChange={e => {
                        /^[0-9]*[.,]?[0-9]*$/.test(e.target.value) && handleChange(e);
                    }}
                />
                <div className={`${usdPosition === "right" ? "absolute bottom-4" : "h-5"} usd-suffix text-base font-medium text-secondary-text pointer-events-none`} ref={suffixRef}>
                    {`${requestedAmountInUsd ?? '$0'}`}
                </div>
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