import { useFormikContext } from "formik";
import { forwardRef, useEffect, useMemo, useRef } from "react";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import NumericInput from "../NumericInput";
import { useQuoteData } from "@/hooks/useFee";
import { formatUsd } from "@/components/utils/formatUsdAmount";
import clsx from "clsx";

interface AmountFieldProps {
    usdPosition?: "right" | "bottom";
    fee: ReturnType<typeof useQuoteData>['quote'];
    actionValue?: number;
}

const AmountField = forwardRef(function AmountField({ usdPosition = "bottom", actionValue, fee }: AmountFieldProps, ref: any) {
    const { values, handleChange } = useFormikContext<SwapFormValues>();
    const { fromAsset: fromCurrency, amount, toAsset: toCurrency, fromExchange } = values || {};
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

    const actionValueInUsd = useMemo(() => {
        const amountNumber = Number(actionValue);
        if (isNaN(amountNumber) || amountNumber <= 0 || !sourceCurrencyPriceInUsd)
            return undefined;
        return formatUsd(sourceCurrencyPriceInUsd * amountNumber)
    }, [actionValue, sourceCurrencyPriceInUsd]);


    useEffect(() => {
        const input = amountRef.current;
        const suffix = suffixRef.current;

        if (!input || !suffix) return;

        const font = getFontFromElement(input);
        const width = getTextWidth(actionValue?.toString() || amount || "0", font);

        suffix.style.left = `${width + 16}px`;
    }, [amount, requestedAmountInUsd, actionValue]);
    
    const placeholder = '0'

    const step = 1 / Math.pow(10, fromCurrency?.precision || 1)

    const disabled = Boolean(fromExchange && !toCurrency)

    return (<>
        <div className="flex flex-col w-full bg-secondary-500 rounded-lg">
            <div className={`space-y-0.5 relative w-full group-[.exchange-amount-field]:pb-2 group ${usdPosition === "right" ? "focus-within:[&_.usd-suffix]:invisible" : ""}`}>
                <NumericInput
                    disabled={disabled}
                    placeholder={placeholder}
                    step={isNaN(step) ? 0.01 : step}
                    name={name}
                    ref={amountRef}
                    precision={fromCurrency?.precision}
                    tempValue={actionValue}
                    className="w-full text-[28px] text-primary-text placeholder:!text-primary-text leading-normal focus:outline-none focus:border-none focus:ring-0 transition-all duration-300 ease-in-out !bg-secondary-500 !font-normal group-[.exchange-amount-field]:px-2.5 group-[.exchange-amount-field]:pb-2 group-[.exchange-amount-field]:pr-2 group-[.exchange-amount-field]:bg-secondary-300! pl-0"
                    onChange={e => {
                        /^[0-9]*[.,]?[0-9]*$/.test(e.target.value) && handleChange(e);
                    }}
                />

                <div className={clsx(
                    "usd-suffix text-base font-medium text-secondary-text pointer-events-none",
                    {
                        "absolute bottom-4": usdPosition === "right",
                        "h-5": usdPosition !== "right",
                        "text-secondary-text/45": !!actionValueInUsd
                    },
                    "group-hover:block"
                )} ref={suffixRef}>
                    {`${actionValueInUsd ?? requestedAmountInUsd ?? '$0'}`}
                </div>
            </div>
        </div >
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