import { useFormikContext } from "formik";
import { forwardRef, useEffect, useMemo, useRef } from "react";
import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import NumericInput from "../NumericInput";
import { useQuoteData } from "@/hooks/useFee";
import { formatUsd } from "@/components/utils/formatUsdAmount";
import clsx from "clsx";
import { resolveTokenUsdPrice } from "@/helpers/tokenHelper";

interface AmountFieldProps {
    fee: ReturnType<typeof useQuoteData>['quote'];
    actionValue?: number;
    className?: string;
}

const ExchangeAmountField = forwardRef(function AmountField({ actionValue, fee, className }: AmountFieldProps, ref: any) {
    const { values, handleChange } = useFormikContext<SwapFormValues>();
    const { fromAsset: fromCurrency, amount, toAsset: toCurrency, fromExchange } = values || {};
    const name = "amount"
    const amountRef = useRef(ref)
    const suffixRef = useRef<HTMLDivElement>(null);

    const sourceCurrencyPriceInUsd = resolveTokenUsdPrice(fromCurrency, fee?.quote)

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
        <div className={clsx("flex flex-col bg-secondary-500 space-y-0.5 relative w-full group",
            "focus-within:[&_.usd-suffix]:invisible",
            className
        )}
        >
            <NumericInput
                disabled={disabled}
                placeholder={placeholder}
                step={isNaN(step) ? 0.01 : step}
                name={name}
                ref={amountRef}
                precision={fromCurrency?.precision}
                tempValue={actionValue}
                className="w-full leading-[34px] rounded-xl text-primary-text focus:outline-none focus:border-none focus:ring-0 duration-300 ease-in-out font-normal! text-xl px-2.5! pb-2 pr-2 bg-secondary-300! pl-0"
                onChange={e => {
                    /^[0-9]*[.,]?[0-9]*$/.test(e.target.value) && handleChange(e);
                }}
            />
            <div className={clsx(
                "usd-suffix text-sm leading-5 font-medium text-secondary-text pointer-events-none",
                {
                    "absolute bottom-3.5": true,
                    "text-secondary-text/45": !!actionValueInUsd
                },
                "group-hover:block"
            )} ref={suffixRef}>
                {`${actionValueInUsd ?? requestedAmountInUsd ?? '$0'}`}
            </div>
        </div>
    </>)
});

export default ExchangeAmountField

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
