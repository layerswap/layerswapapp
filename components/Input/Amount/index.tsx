import { useFormikContext } from "formik";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import NumericInput from "../NumericInput";
import { useQuoteData } from "@/hooks/useFee";
import { formatUsd } from "@/components/utils/formatUsdAmount";
import clsx from "clsx";
import { resolveTokenUsdPrice } from "@/helpers/tokenHelper";
import { useSwitchUsdToken } from "@/context/switchUsdToken";
import NumericInputControlled from "./NumericInputControlled";
import { ArrowUpDown } from "lucide-react";
import { formatTokenAmount, trimZeros } from "@/components/utils/numbers";

interface AmountFieldProps {
    fee: ReturnType<typeof useQuoteData>['quote'];
    actionValue?: number;
    className?: string;
    showQuickActions?: boolean;
}

const AmountField = forwardRef(function AmountField({ actionValue, fee, className, showQuickActions }: AmountFieldProps, ref: any) {

    const { values, handleChange, setFieldValue } = useFormikContext<SwapFormValues>();
    const { fromAsset: fromCurrency, amount, toAsset: toCurrency, fromExchange, from } = values || {};
    const name = "amount"
    const amountRef = useRef(ref)
    const suffixRef = useRef<HTMLDivElement>(null);

    const [usdAmount, setUsdAmount] = useState<string>("");
    const lastEditRef = useRef<"usd" | "token" | null>(null);
    const isUpdatingFromUsdInputRef = useRef<boolean>(false);
    const { isUsdPrimary, toggleUsdPrimary } = useSwitchUsdToken()

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

    const tokenSuffixText = useMemo(() => {
        if (actionValue && Number(actionValue) > 0) {
            return Number(actionValue);
        }

        if (amount && Number(amount) > 0) {
            return `${amount} ${fromCurrency?.symbol}`;
        }

        return `0 ${fromCurrency?.symbol}`;
    }, [amount, actionValue, fromCurrency]);

    useEffect(() => {
        if (!isUsdPrimary) return;

        if (isUpdatingFromUsdInputRef.current) {
            isUpdatingFromUsdInputRef.current = false;
            return;
        }

        if (lastEditRef.current === "usd") {
            lastEditRef.current = null;
        }

        const amountNumber = Number(amount);
        if (
            !sourceCurrencyPriceInUsd ||
            isNaN(amountNumber) ||
            amountNumber <= 0
        ) {
            setUsdAmount("");
            return;
        }

        const usd = amountNumber * sourceCurrencyPriceInUsd;
        setUsdAmount(trimZeros(usd.toFixed(2)));
    }, [isUsdPrimary, amount, sourceCurrencyPriceInUsd]);

    useEffect(() => {
        const input = amountRef.current;
        const suffix = suffixRef.current;

        if (!input || !suffix) return;

        const font = getFontFromElement(input);
        const width = getTextWidth(actionValue?.toString() || amount || "0", font);
        suffix.style.left = `${width + 16}px`;
    }, [amount, requestedAmountInUsd, actionValue]);

    const placeholder = "0";
    const step = 1 / Math.pow(10, fromCurrency?.precision || 1);
    const disabled = Boolean(fromExchange && !toCurrency);

    const onToggle = () => {
        toggleUsdPrimary();
    };

    return (
        <div className={clsx("flex flex-col bg-secondary-500 space-y-0.5 relative w-full group",
            className
        )}
        >
            {!isUsdPrimary ? (
                <NumericInput
                    disabled={disabled}
                    placeholder={placeholder}
                    step={isNaN(step) ? 0.01 : step}
                    name={name}
                    ref={amountRef}
                    precision={fromCurrency?.precision}
                    tempValue={actionValue}
                    className="w-full text-[28px] leading-[34px] rounded-xl text-primary-text focus:outline-none focus:border-none focus:ring-0 duration-300 ease-in-out bg-secondary-500! font-normal! pl-0"
                    onChange={e => {
                        /^[0-9]*[.,]?[0-9]*$/.test(e.target.value) && handleChange(e);
                    }}
                />
            ) : (
                <NumericInputControlled
                    disabled={disabled}
                    placeholder={placeholder}
                    step={0.01}
                    precision={2}
                    ref={amountRef}
                    tempValue={Number(actionValueInUsd?.replace("$", ""))}
                    value={usdAmount}
                    onValueChange={(val) => {
                        lastEditRef.current = "usd";
                        isUpdatingFromUsdInputRef.current = true;
                        setUsdAmount(val);

                        const usdN = Number(val);
                        if (
                            !sourceCurrencyPriceInUsd ||
                            isNaN(usdN) ||
                            usdN <= 0
                        ) {
                            setFieldValue("amount", "");
                            return;
                        }

                        const precision = fromCurrency?.precision ?? 6;
                        const tokenN = usdN / sourceCurrencyPriceInUsd;
                        const tokenStr = formatTokenAmount(tokenN, precision);
                        setFieldValue("amount", tokenStr);
                    }}
                    className="w-full text-[28px] leading-[34px] rounded-xl text-primary-text focus:outline-none focus:border-none focus:ring-0 duration-300 ease-in-out bg-secondary-500! font-normal! pl-0"
                />
            )}

            <div className="flex items-center gap-1">
                <div
                    className={clsx(
                        "usd-suffix text-base leading-5 font-medium text-secondary-text pointer-events-none h-5",
                        {
                            "text-secondary-text/45": !!actionValueInUsd,
                        },
                        "group-hover:block"
                    )}
                    ref={suffixRef}
                >
                    {!isUsdPrimary
                        ? `${actionValueInUsd ?? requestedAmountInUsd ?? "$0"}`
                        : tokenSuffixText}
                </div>

                {from && fromCurrency && !fromExchange &&
                    <button
                        type="button"
                        onClick={onToggle}
                        className={clsx(
                            "bg-secondary-300 hover:bg-secondary-200 p-0.5 rounded-sm transition text-secondary-text hover:text-primary-text",
                            {
                                "hidden": !showQuickActions,
                                "block": showQuickActions
                            },
                            "group-hover:block"
                        )}
                    >
                        <ArrowUpDown className="w-4 h-4" />
                    </button>
                }
            </div>
        </div>
    );
});

export default AmountField;

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