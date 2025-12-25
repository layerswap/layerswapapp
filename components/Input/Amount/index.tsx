import { useFormikContext } from "formik";
import { forwardRef, useEffect, useMemo, useRef } from "react";
import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import NumericInput from "../NumericInput";
import { useQuoteData } from "@/hooks/useFee";
import { formatUsd } from "@/components/utils/formatUsdAmount";
import clsx from "clsx";
import { resolveTokenUsdPrice } from "@/helpers/tokenHelper";
import { getPrecisionForMinUsd, truncateDecimals } from "@/components/utils/RoundDecimals";

interface AmountFieldProps {
    usdPosition?: "right" | "bottom";
    fee: ReturnType<typeof useQuoteData>['quote'];
    actionValue?: number;
    className?: string;
    showQuickActions?: boolean;
}

const AmountField = forwardRef(function AmountField({ usdPosition = "bottom", actionValue, fee, className, showQuickActions }: AmountFieldProps, ref: any) {
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

    const dynamicPrecision = fromCurrency && getPrecisionForMinUsd(fromCurrency?.price_in_usd)
    const truncatedAmount =
        dynamicPrecision != null && amount
            ? truncateDecimals(
                Number(amount),
                Math.max(dynamicPrecision, fromCurrency?.precision ?? 0)
            )
            : undefined;
    console.log('amount', amount, actionValue);
    console.log('truncatedAmount', truncatedAmount);

    const placeholder = '0'

    const step = 1 / Math.pow(10, fromCurrency?.precision || 1)

    const disabled = Boolean(fromExchange && !toCurrency)

    return (<>
        <div className={clsx("flex flex-col bg-secondary-500 space-y-0.5 relative w-full group",
            className,
            {
                'focus-within:[&_.usd-suffix]:invisible': usdPosition === "right"
            }
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
                className="w-full text-[28px] leading-[34px] rounded-xl text-primary-text focus:outline-none focus:border-none focus:ring-0 duration-300 ease-in-out bg-secondary-500! font-normal! group-[.exchange-amount-field]:text-xl group-[.exchange-amount-field]:px-2.5 group-[.exchange-amount-field]:pb-2 group-[.exchange-amount-field]:pr-2 group-[.exchange-amount-field]:bg-secondary-300! pl-0"
                onChange={e => {
                    /^[0-9]*[.,]?[0-9]*$/.test(e.target.value) && handleChange(e);
                }}
            />
            <div className={clsx(
                "usd-suffix text-base group-[.exchange-amount-field]:text-sm leading-5 font-medium text-secondary-text pointer-events-none",
                {
                    "absolute bottom-3 group-[.exchange-amount-field]:bottom-3.5": usdPosition === "right",
                    "h-5": usdPosition !== "right",
                    "text-secondary-text/45": !!actionValueInUsd
                },
                "group-hover:block"
            )} ref={suffixRef}>
                {`${actionValueInUsd ?? requestedAmountInUsd ?? '$0'}`}
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