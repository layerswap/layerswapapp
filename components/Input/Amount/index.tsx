import { useFormikContext } from "formik";
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import NumericInput from "../NumericInput";
import { useQuoteData } from "@/hooks/useFee";
import { formatUsd } from "@/components/utils/formatUsdAmount";
import clsx from "clsx";
import { resolveTokenUsdPrice } from "@/helpers/tokenHelper";
import { ArrowUpDown } from "lucide-react";
import { useAmountModeStore } from "@/stores/amountModeStore";

interface AmountFieldProps {
    usdPosition?: "right" | "bottom";
    fee: ReturnType<typeof useQuoteData>['quote'];
    actionValue?: number;
    className?: string;
}

const AmountField = forwardRef(function AmountField({ usdPosition = "bottom", actionValue, fee, className }: AmountFieldProps, ref: any) {
    const { values, handleChange, setFieldValue } = useFormikContext<SwapFormValues>();
    const { fromAsset: fromCurrency, amount, toAsset: toCurrency, fromExchange } = values || {};
    const name = "amount"
    const amountRef = useRef(ref)
    const suffixRef = useRef<HTMLDivElement>(null);
    const { inputMode, setInputMode } = useAmountModeStore();
    const [usdInputValue, setUsdInputValue] = useState<string>("");

    const sourceCurrencyPriceInUsd = resolveTokenUsdPrice(fromCurrency, fee?.quote)
    const hasUsdPrice = Number(sourceCurrencyPriceInUsd) > 0;

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

    const actionValueForInput = useMemo(() => {
        if (actionValue === undefined || actionValue === null)
            return undefined;

        const actionAmount = Number(actionValue);
        if (!Number.isFinite(actionAmount) || actionAmount < 0)
            return undefined;

        if (inputMode !== "usd")
            return actionAmount;

        if (!hasUsdPrice)
            return undefined;

        const usdAmount = actionAmount * Number(sourceCurrencyPriceInUsd);
        const usdValue = Number(toFixedTrimmed(usdAmount, 2));
        return Number.isFinite(usdValue) ? usdValue : undefined;
    }, [actionValue, hasUsdPrice, inputMode, sourceCurrencyPriceInUsd]);

    const amountInTokenText = useMemo(() => {
        const sourceAmount = actionValue?.toString() ?? amount;
        return `${sourceAmount && Number(sourceAmount) > 0 ? sourceAmount : '0'} ${fromCurrency?.symbol || ''}`.trim();
    }, [actionValue, amount, fromCurrency?.symbol]);

    const handleToggleInputMode = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();

        if (!hasUsdPrice)
            return;

        if (inputMode === "token") {
            setUsdInputValue(convertTokenToUsdInput(amount, Number(sourceCurrencyPriceInUsd)));
            setInputMode("usd");
            return;
        }

        setInputMode("token");
    }, [amount, hasUsdPrice, inputMode, sourceCurrencyPriceInUsd]);

    const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (inputMode === "token") {
            /^[0-9]*[.,]?[0-9]*$/.test(e.target.value) && handleChange(e);
            return;
        }

        const normalized = e.target.value.replace(/,/g, '.');
        setUsdInputValue(normalized);

        if (!hasUsdPrice) {
            setFieldValue(name, '', true);
            return;
        }

        if (normalized === '' || normalized === '.') {
            setFieldValue(name, '', true);
            return;
        }

        const usdAmount = Number(normalized);
        if (!Number.isFinite(usdAmount) || usdAmount < 0)
            return;

        const tokenAmount = usdAmount / Number(sourceCurrencyPriceInUsd);
        const precision = fromCurrency?.precision ?? 8;
        const tokenFieldValue = toFixedTrimmed(tokenAmount, precision);
        setFieldValue(name, tokenFieldValue, true);
    }, [fromCurrency?.precision, handleChange, hasUsdPrice, inputMode, setFieldValue, sourceCurrencyPriceInUsd]);

    useEffect(() => {
        const input = amountRef.current;
        const suffix = suffixRef.current;

        if (!input || !suffix) return;

        const font = getFontFromElement(input);
        const baseInputValue = inputMode === "usd" ? usdInputValue : amount;
        const previewValue = actionValueForInput !== undefined ? actionValueForInput.toString() : undefined;
        const width = getTextWidth(previewValue || baseInputValue || "0", font);
        suffix.style.left = `${width + 16}px`;
    }, [amount, requestedAmountInUsd, actionValueForInput, inputMode, usdInputValue]);

    useEffect(() => {
        setInputMode("token");
        setUsdInputValue("");
    }, [fromCurrency?.symbol]);

    useEffect(() => {
        if (hasUsdPrice)
            return;

        setInputMode("token");
        setUsdInputValue("");
    }, [hasUsdPrice]);

    useEffect(() => {
        if (inputMode !== "usd" || !hasUsdPrice)
            return;

        const price = Number(sourceCurrencyPriceInUsd);
        // Check if current usdInputValue already corresponds to the same token amount.
        // This preserves partial input (trailing dot/zeros) during typing while still
        // syncing when an external source (e.g. MinMax) changes the token amount.
        const currentUsdNum = Number(usdInputValue.replace(/,/g, '.'));
        if (usdInputValue !== '' && Number.isFinite(currentUsdNum) && currentUsdNum >= 0 && price > 0) {
            const precision = fromCurrency?.precision ?? 8;
            const derivedTokenAmount = toFixedTrimmed(currentUsdNum / price, precision);
            if (derivedTokenAmount === (amount || '')) {
                return;
            }
        }

        setUsdInputValue(convertTokenToUsdInput(amount, price));
    }, [amount, fromCurrency?.precision, hasUsdPrice, inputMode, sourceCurrencyPriceInUsd, usdInputValue]);

    const placeholder = '0'

    const step = 1 / Math.pow(10, fromCurrency?.precision || 1)

    const disabled = Boolean(fromExchange && !toCurrency)
    const usdSuffixText = actionValueInUsd ?? requestedAmountInUsd ?? '$0'
    const suffixText = inputMode === "usd" ? amountInTokenText : usdSuffixText

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
                precision={inputMode === "usd" ? 2 : fromCurrency?.precision}
                tempValue={actionValueForInput}
                valueOverride={inputMode === "usd" ? usdInputValue : undefined}
                className={clsx(
                    "w-full text-[28px] leading-[34px] rounded-xl text-primary-text focus:outline-none focus:border-none focus:ring-0 duration-300 ease-in-out bg-secondary-500! font-normal! group-[.exchange-amount-field]:text-xl group-[.exchange-amount-field]:px-2.5 group-[.exchange-amount-field]:pb-2 group-[.exchange-amount-field]:pr-2 group-[.exchange-amount-field]:bg-secondary-300! px-0 truncate",
                    {
                        "pl-6 group-[.exchange-amount-field]:pl-5": inputMode === "usd",
                    }
                )}
                onBlur={() => {
                    if (inputMode === "usd" && hasUsdPrice) {
                        setUsdInputValue(convertTokenToUsdInput(amount, Number(sourceCurrencyPriceInUsd)));
                    }
                }}
                onChange={handleAmountChange}
            >
                {inputMode === "usd" ? (
                    <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 text-[28px] leading-[34px] text-primary-text pointer-events-none group-[.exchange-amount-field]:text-xl group-[.exchange-amount-field]:left-2"
                        aria-hidden="true"
                    >
                        $
                    </span>
                ) : null}
            </NumericInput>
            <div className={clsx(
                "usd-suffix text-base group-[.exchange-amount-field]:text-sm leading-5 font-medium text-secondary-text pointer-events-auto flex items-end gap-1.5 max-w-full",
                {
                    "absolute bottom-3 group-[.exchange-amount-field]:bottom-3.5": usdPosition === "right",
                    "h-5": usdPosition !== "right",
                    "text-secondary-text/45": !!actionValueInUsd
                },
            )} ref={suffixRef}>
                <span className="pointer-events-none truncate">{suffixText}</span>
                {hasUsdPrice ? (
                    <button
                        type="button"
                        aria-label={inputMode === "usd" ? "Switch to token input" : "Switch to USD input"}
                        title={inputMode === "usd" ? "Switch to token input" : "Switch to USD input"}
                        onClick={handleToggleInputMode}
                        className="bg-secondary-300 hidden group-hover:flex items-center p-0.5 rounded hover:bg-secondary-200 transition-colors duration-200 cursor-pointer shrink-0"
                    >
                        <ArrowUpDown className="h-4 w-4 text-secondary-text" />
                    </button>
                ) : null}
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

function toFixedTrimmed(value: number, precision: number): string {
    if (!Number.isFinite(value))
        return '';

    const safePrecision = Math.max(0, precision);
    return value.toFixed(safePrecision).replace(/\.?0+$/, '');
}

function convertTokenToUsdInput(tokenAmount: string | number | undefined, usdPrice: number): string {
    if (tokenAmount === undefined || tokenAmount === null || tokenAmount === '' || !Number.isFinite(usdPrice) || usdPrice <= 0)
        return '';

    const parsedTokenAmount = Number(tokenAmount);
    if (!Number.isFinite(parsedTokenAmount) || parsedTokenAmount < 0)
        return '';

    if (parsedTokenAmount === 0)
        return '0';

    return toFixedTrimmed(parsedTokenAmount * usdPrice, 2);
}
