import { useFormikContext } from "formik";
import { forwardRef, useCallback, useEffect, useMemo, useRef } from "react";
import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import NumericInput from "../NumericInput";
import { useQuoteData } from "@/hooks/useFee";
import { formatUsd } from "@/components/utils/formatUsdAmount";
import clsx from "clsx";

import { useUsdModeStore } from "@/stores/usdModeStore";
import { ArrowUpDown } from "lucide-react";

interface AmountFieldProps {
    usdPosition?: "right" | "bottom";
    fee: ReturnType<typeof useQuoteData>['quote'];
    actionValue?: number;
    className?: string;
    showToggle?: boolean;
}

const AmountField = forwardRef(function AmountField({ usdPosition = "bottom", actionValue, fee, className, showToggle }: AmountFieldProps, ref: any) {
    const { values, handleChange, setFieldValue } = useFormikContext<SwapFormValues>();
    const { fromAsset: fromCurrency, amount, toAsset: toCurrency, fromExchange } = values || {};
    const name = "amount"
    const amountRef = useRef(ref)
    const suffixRef = useRef<HTMLDivElement>(null);

    const isUsdMode = useUsdModeStore(s => s.isUsdMode);
    const usdAmount = useUsdModeStore(s => s.usdAmount);
    const setUsdAmount = useUsdModeStore(s => s.setUsdAmount);
    const toggleMode = useUsdModeStore(s => s.toggleMode);

    // Cache the last quote-derived price so we don't fall back to the token's
    // static price_in_usd when the quote temporarily disappears (re-fetching, error).
    const lastQuotePriceRef = useRef<{ symbol: string; price: number } | null>(null);
    const quote = fee?.quote;
    const quotePriceForSource =
        (quote?.source_token?.symbol === fromCurrency?.symbol) ? quote?.source_token?.price_in_usd :
            (quote?.destination_token?.symbol === fromCurrency?.symbol) ? quote?.destination_token?.price_in_usd :
                undefined;

    if (quotePriceForSource && fromCurrency?.symbol) {
        lastQuotePriceRef.current = { symbol: fromCurrency.symbol, price: quotePriceForSource };
    }

    const sourceCurrencyPriceInUsd = quotePriceForSource
        ?? (lastQuotePriceRef.current?.symbol === fromCurrency?.symbol ? lastQuotePriceRef.current?.price : undefined)
        ?? fromCurrency?.price_in_usd;

    const prevPriceRef = useRef(sourceCurrencyPriceInUsd);
    const prevTokenSymbolRef = useRef(fromCurrency?.symbol);

    // --- Token mode computations ---

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

    // --- USD mode computations ---

    const actionValueAsUsd = useMemo(() => {
        if (actionValue === undefined || actionValue <= 0 || !sourceCurrencyPriceInUsd)
            return undefined;
        return (actionValue * sourceCurrencyPriceInUsd).toFixed(2).replace(/\.?0+$/, '');
    }, [actionValue, sourceCurrencyPriceInUsd]);

    const actionValueAsToken = useMemo(() => {
        if (actionValue === undefined || actionValue <= 0) return undefined;
        const precision = fromCurrency?.precision || 6;
        return formatTokenAmount(actionValue, precision);
    }, [actionValue, fromCurrency?.precision]);

    // Formatted token amount for the secondary line (matches actionValueAsToken precision)
    const formattedTokenAmount = useMemo(() => {
        const num = Number(amount);
        if (isNaN(num) || num <= 0) return '0';
        const precision = fromCurrency?.precision || 6;
        return formatTokenAmount(num, precision);
    }, [amount, fromCurrency?.precision]);

    // --- USD ↔ Token conversion ---

    // Tracks whether an amount change originated from internal USD logic
    // (USD input, price change effect, token change effect) vs external (quick actions).
    const internalAmountChangeRef = useRef(false);

    const computeAndSetTokenAmount = useCallback((usdValue: string) => {
        let newAmount: string;
        if (!sourceCurrencyPriceInUsd || sourceCurrencyPriceInUsd === 0 || !usdValue) {
            newAmount = '';
        } else {
            const usdNum = Number(usdValue);
            if (isNaN(usdNum) || usdNum <= 0) {
                newAmount = '';
            } else {
                const precision = fromCurrency?.precision || 6;
                const tokenAmount = usdNum / sourceCurrencyPriceInUsd;
                const truncated = Math.trunc(tokenAmount * Math.pow(10, precision)) / Math.pow(10, precision);
                newAmount = truncated.toString();
            }
        }
        // Only mark as internal change if the value will actually change,
        // otherwise the sync effect won't fire and the flag stays stuck.
        if (newAmount !== (amount || '')) {
            internalAmountChangeRef.current = true;
        }
        setFieldValue('amount', newAmount, true);
    }, [sourceCurrencyPriceInUsd, fromCurrency?.precision, setFieldValue, amount]);

    // Recompute token amount when price changes in USD mode
    useEffect(() => {
        if (!isUsdMode || !sourceCurrencyPriceInUsd || !usdAmount) {
            prevPriceRef.current = sourceCurrencyPriceInUsd;
            return;
        }
        if (prevPriceRef.current === sourceCurrencyPriceInUsd) return;
        prevPriceRef.current = sourceCurrencyPriceInUsd;
        computeAndSetTokenAmount(usdAmount);
    }, [sourceCurrencyPriceInUsd, isUsdMode, usdAmount, computeAndSetTokenAmount]);

    // Recompute token amount when source token changes in USD mode
    useEffect(() => {
        if (!isUsdMode || !sourceCurrencyPriceInUsd || !usdAmount) return;
        if (prevTokenSymbolRef.current === fromCurrency?.symbol) return;
        prevTokenSymbolRef.current = fromCurrency?.symbol;
        prevPriceRef.current = sourceCurrencyPriceInUsd;
        computeAndSetTokenAmount(usdAmount);
    }, [fromCurrency?.symbol, isUsdMode, sourceCurrencyPriceInUsd, usdAmount, computeAndSetTokenAmount]);

    // Sync usdAmount when formik amount changes externally (e.g. quick action buttons).
    // Runs as a passive effect — the ref-based guard ensures only truly external
    // changes (like quick-action clicks) trigger the sync, so there is no visible flash.
    useEffect(() => {
        if (internalAmountChangeRef.current) {
            internalAmountChangeRef.current = false;
            return;
        }
        if (!isUsdMode || !sourceCurrencyPriceInUsd) return;
        const amountNum = Number(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            setUsdAmount('');
            return;
        }
        setUsdAmount((amountNum * sourceCurrencyPriceInUsd).toFixed(2).replace(/\.?0+$/, ''));
    }, [amount]); // eslint-disable-line react-hooks/exhaustive-deps -- only react to external amount changes

    // --- Toggle handler ---

    const handleToggle = useCallback(() => {
        if (!isUsdMode && sourceCurrencyPriceInUsd) {
            // Token → USD: compute USD from current token amount
            const amountNum = Number(amount);
            if (!isNaN(amountNum) && amountNum > 0) {
                setUsdAmount((amountNum * sourceCurrencyPriceInUsd).toFixed(2).replace(/\.?0+$/, ''));
            } else {
                setUsdAmount('');
            }
        }
        // USD → Token: formik.amount already has the correct value
        toggleMode();
    }, [isUsdMode, amount, sourceCurrencyPriceInUsd, setUsdAmount, toggleMode]);

    // --- USD input handler ---

    const handleUsdInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(',', '.');
        if (value !== '' && !/^[0-9]+\.?[0-9]{0,2}$/.test(value) && value !== '0.') return;
        setUsdAmount(value);
        computeAndSetTokenAmount(value);
    }, [setUsdAmount, computeAndSetTokenAmount]);

    // --- Suffix positioning for token mode ---

    useEffect(() => {
        if (isUsdMode) return;
        const input = amountRef.current;
        const suffix = suffixRef.current;
        if (!input || !suffix) return;
        const font = getFontFromElement(input);
        const width = getTextWidth(actionValue?.toString() || amount || "0", font);
        suffix.style.left = `${width + 16}px`;
    }, [amount, requestedAmountInUsd, actionValue, isUsdMode]);

    const placeholder = '0'
    const step = 1 / Math.pow(10, fromCurrency?.precision || 1)
    const disabled = Boolean(fromExchange && !toCurrency)
    const canToggle = usdPosition === "bottom" && !!sourceCurrencyPriceInUsd;

    const toggleButton = canToggle ? (
        <button
            type="button"
            onClick={handleToggle}
            className={clsx(
                "inline-flex items-center p-0.5 rounded-md bg-secondary-300 hover:bg-secondary-200 text-secondary-text hover:text-primary-buttonTextColor transition cursor-pointer pointer-events-auto",
                !showToggle && "hidden group-hover/source:inline-flex"
            )}
        >
            <ArrowUpDown className="w-3.5 h-3.5" />
        </button>
    ) : null;

    // --- USD mode render ---

    if (isUsdMode && usdPosition === "bottom") {
        const previewUsd = actionValueAsUsd;
        const previewToken = actionValueAsToken;

        return (
            <div className={clsx("flex flex-col bg-secondary-500 space-y-0.5 relative w-full", className)}>
                <div className="flex items-center h-12">
                    <span className="text-[28px] leading-[34px] text-primary-text font-normal mr-1 select-none">$</span>
                    <input
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        autoCorrect="off"
                        disabled={disabled}
                        placeholder="0"
                        value={previewUsd ?? usdAmount}
                        onChange={handleUsdInputChange}
                        className={clsx(
                            "w-full text-[28px] leading-[34px] rounded-xl focus:outline-none focus:border-none focus:ring-0 duration-300 ease-in-out font-normal px-0 truncate bg-secondary-500 border-0",
                            previewUsd ? "text-secondary-text/45" : "text-primary-text",
                            "placeholder:text-secondary-text"
                        )}
                    />
                </div>
                <div className="flex items-center gap-1 text-base leading-5 font-medium text-secondary-text h-5 min-w-0">
                    {toggleButton}
                    <span className={clsx("flex items-center min-w-0 space-x-1", { "text-secondary-text/45": !!previewToken })}>
                        <span className="truncate min-w-0">
                            {`${previewToken ?? formattedTokenAmount}`}
                        </span>
                        <span className="shrink-0">
                            {` ${fromCurrency?.symbol || ''}`}
                        </span>
                    </span>
                </div>
            </div>
        );
    }

    // --- Token mode render (default) ---

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
                className="w-full text-[28px] leading-[34px] rounded-xl text-primary-text focus:outline-none focus:border-none focus:ring-0 duration-300 ease-in-out bg-secondary-500! font-normal! group-[.exchange-amount-field]:text-xl group-[.exchange-amount-field]:px-2.5 group-[.exchange-amount-field]:pb-2 group-[.exchange-amount-field]:pr-2 group-[.exchange-amount-field]:bg-secondary-300! px-0 truncate"
                onChange={e => {
                    /^[0-9]*[.,]?[0-9]*$/.test(e.target.value) && handleChange(e);
                }}
            />
            <div className={clsx(
                "usd-suffix text-base leading-5 font-medium text-secondary-text pointer-events-none",
                {
                    "absolute bottom-3 group-[.exchange-amount-field]:bottom-3.5": usdPosition === "right",
                    "h-5 flex items-center gap-1": usdPosition !== "right",
                    "text-secondary-text/45": !!actionValueInUsd
                },
                "group-hover:flex"
            )} ref={suffixRef}>
                {toggleButton}
                <span>{`${actionValueInUsd ?? requestedAmountInUsd ?? '$0'}`}</span>
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

function formatTokenAmount(value: number, precision: number): string {
    const fixed = value.toFixed(precision).replace(/\.?0+$/, '');
    const [intPart, decPart] = fixed.split('.');
    const formattedInt = Number(intPart).toLocaleString('en-US');
    return decPart ? `${formattedInt}.${decPart}` : formattedInt;
}
