import { useFormikContext } from "formik";
import { forwardRef, useEffect, useMemo, useRef } from "react";
import NumericInput from "../NumericInput";
import { QuoteTokenPrices, useQuoteData } from "@/hooks/useFee";
import { formatUsd } from "@/components/utils/formatUsdAmount";
import clsx from "clsx";
import { resolveTokenUsdPrice } from "@/helpers/tokenHelper";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";

interface ExchangeAmountFieldProps {
    fee: ReturnType<typeof useQuoteData>["quote"];
    quoteTokenPrices?: QuoteTokenPrices;
    actionValue?: number;
    className?: string;
}

const ExchangeAmountField = forwardRef(function ExchangeAmountField(
    { actionValue, fee, quoteTokenPrices, className }: ExchangeAmountFieldProps,
    ref: any
) {
    const { values, handleChange } = useFormikContext<SwapFormValues>();
    const { fromAsset: fromCurrency, amount, toAsset: toCurrency, fromExchange } = values || {};

    const amountRef = useRef(ref);
    const suffixRef = useRef<HTMLDivElement>(null);

    const sourceCurrencyPriceInUsd = resolveTokenUsdPrice(fromCurrency, quoteTokenPrices ?? fee?.quote);

    const requestedAmountInUsd = useMemo(() => {
        const amountNumber = Number(amount);
        if (isNaN(amountNumber) || amountNumber <= 0 || !sourceCurrencyPriceInUsd) {
            return undefined;
        }
        return formatUsd(sourceCurrencyPriceInUsd * amountNumber);
    }, [amount, sourceCurrencyPriceInUsd]);

    const actionValueInUsd = useMemo(() => {
        const amountNumber = Number(actionValue);
        if (isNaN(amountNumber) || amountNumber <= 0 || !sourceCurrencyPriceInUsd) {
            return undefined;
        }
        return formatUsd(sourceCurrencyPriceInUsd * amountNumber);
    }, [actionValue, sourceCurrencyPriceInUsd]);

    useEffect(() => {
        const input = amountRef.current;
        const suffix = suffixRef.current;
        if (!input || !suffix) return;

        const font = getFontFromElement(input);
        const width = getTextWidth(actionValue?.toString() || amount || "0", font);
        suffix.style.left = `${width + 16}px`;
    }, [amount, requestedAmountInUsd, actionValue]);

    const step = 1 / Math.pow(10, fromCurrency?.precision || 1);
    const disabled = Boolean(fromExchange && !toCurrency);

    return (
        <div className={clsx("flex flex-col bg-secondary-500 space-y-0.5 relative w-full group focus-within:[&_.usd-suffix]:invisible", className)}>
            <NumericInput
                disabled={disabled}
                placeholder="0"
                step={isNaN(step) ? 0.01 : step}
                name="amount"
                ref={amountRef}
                precision={fromCurrency?.precision}
                tempValue={actionValue}
                className="w-full text-[28px] leading-[34px] rounded-xl text-primary-text focus:outline-none focus:border-none focus:ring-0 duration-300 ease-in-out bg-secondary-500! font-normal! group-[.exchange-amount-field]:text-xl group-[.exchange-amount-field]:px-2.5 group-[.exchange-amount-field]:py-2 group-[.exchange-amount-field]:pr-2 group-[.exchange-amount-field]:bg-secondary-300! px-0 truncate"
                onChange={(e) => {
                    /^[0-9]*[.,]?[0-9]*$/.test(e.target.value) && handleChange(e);
                }}
            />
            <div
                className={clsx(
                    "usd-suffix text-base leading-5 font-medium text-secondary-text pointer-events-none absolute bottom-3.5",
                    {
                        "text-secondary-text/45": !!actionValueInUsd,
                    }
                )}
                ref={suffixRef}
            >
                <span>{`${actionValueInUsd ?? requestedAmountInUsd ?? "$0"}`}</span>
            </div>
        </div>
    );
});

export default ExchangeAmountField;

function getTextWidth(text: string = "", font: string): number {
    if (typeof document === "undefined") return 0;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return 0;

    context.font = font;
    return context.measureText(text).width;
}

function getFontFromElement(el: HTMLElement | null): string {
    if (!el) return "28px sans-serif";
    const style = window.getComputedStyle(el);
    return `${style.fontSize} ${style.fontFamily}`;
}
