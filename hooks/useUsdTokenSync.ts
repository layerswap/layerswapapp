import { useCallback, useEffect, useRef } from "react";
import { useUsdModeStore } from "@/stores/usdModeStore";

// Module-level coordination flag.
// When MinMax sets a known USD value from API limits alongside the token amount,
// this prevents the sync effect from recomputing the USD value from the token amount.
// Module-level (not in zustand) because it's a one-shot flag, not reactive UI state.
let _skipNextSync = false;

/**
 * Call before setting a formik amount when you also set the USD amount directly.
 * Prevents the sync effect from overwriting your precise USD value.
 */
export function skipNextUsdSync() {
    _skipNextSync = true;
}

interface UseUsdTokenSyncArgs {
    quote: {
        source_token?: { symbol: string; price_in_usd: number };
        destination_token?: { symbol: string; price_in_usd: number };
    } | undefined;
    fromCurrency: { symbol?: string; precision?: number; price_in_usd?: number } | undefined;
    amount: string | undefined;
    setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
}

interface UseUsdTokenSyncReturn {
    /** Resolved price: quote price -> cached quote price -> static token price */
    sourceCurrencyPriceInUsd: number | undefined;
    isUsdMode: boolean;
    usdAmount: string;
    handleToggle: () => void;
    handleUsdInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function useUsdTokenSync({
    quote,
    fromCurrency,
    amount,
    setFieldValue,
}: UseUsdTokenSyncArgs): UseUsdTokenSyncReturn {
    const isUsdMode = useUsdModeStore(s => s.isUsdMode);
    const usdAmount = useUsdModeStore(s => s.usdAmount);
    const setUsdAmount = useUsdModeStore(s => s.setUsdAmount);
    const toggleMode = useUsdModeStore(s => s.toggleMode);

    // --- Price resolution with fallback chain ---

    // Cache the last quote-derived price so we don't fall back to the token's
    // static price_in_usd when the quote temporarily disappears (re-fetching, error).
    const lastQuotePriceRef = useRef<{ symbol: string; price: number } | null>(null);

    const quotePriceForSource =
        (quote?.source_token?.symbol === fromCurrency?.symbol) ? quote?.source_token?.price_in_usd :
            (quote?.destination_token?.symbol === fromCurrency?.symbol) ? quote?.destination_token?.price_in_usd :
                undefined;

    // Update the cache in an effect (not during render) to avoid side-effects in the render path.
    useEffect(() => {
        if (quotePriceForSource && fromCurrency?.symbol) {
            lastQuotePriceRef.current = { symbol: fromCurrency.symbol, price: quotePriceForSource };
        }
    }, [quotePriceForSource, fromCurrency?.symbol]);

    const sourceCurrencyPriceInUsd = quotePriceForSource
        ?? (lastQuotePriceRef.current?.symbol === fromCurrency?.symbol ? lastQuotePriceRef.current?.price : undefined)
        ?? fromCurrency?.price_in_usd;

    // --- Sync coordination refs ---

    const prevPriceRef = useRef(sourceCurrencyPriceInUsd);
    const prevTokenSymbolRef = useRef(fromCurrency?.symbol);
    const internalAmountChangeRef = useRef(false);
    const currentAmountRef = useRef(amount);
    currentAmountRef.current = amount;
    const prevAmountRef = useRef(amount);

    // --- Core conversion: USD -> token ---

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
        // Only mark as internal if the value actually changes;
        // otherwise the sync effect won't fire and the flag stays stuck.
        if (newAmount !== (currentAmountRef.current || '')) {
            internalAmountChangeRef.current = true;
        }
        setFieldValue('amount', newAmount, true);
    }, [sourceCurrencyPriceInUsd, fromCurrency?.precision, setFieldValue]);

    // --- Sync effects ---

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
    // The ref-based guards ensure only truly external changes trigger the sync.
    useEffect(() => {
        const amountChanged = prevAmountRef.current !== amount;
        prevAmountRef.current = amount;

        // Always clear the skip flag to prevent it from getting stuck.
        const skipSync = _skipNextSync;
        if (skipSync) _skipNextSync = false;

        if (internalAmountChangeRef.current) {
            internalAmountChangeRef.current = false;
            return;
        }
        if (!amountChanged) return;
        if (skipSync) return;
        if (!isUsdMode || !sourceCurrencyPriceInUsd) return;

        const amountNum = Number(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            setUsdAmount('');
            return;
        }
        setUsdAmount((amountNum * sourceCurrencyPriceInUsd).toFixed(2).replace(/\.?0+$/, ''));
    }, [amount, isUsdMode, sourceCurrencyPriceInUsd, setUsdAmount]);

    // --- Toggle handler ---

    const handleToggle = useCallback(() => {
        if (!isUsdMode && sourceCurrencyPriceInUsd) {
            const amountNum = Number(amount);
            if (!isNaN(amountNum) && amountNum > 0) {
                setUsdAmount((amountNum * sourceCurrencyPriceInUsd).toFixed(2).replace(/\.?0+$/, ''));
            } else {
                setUsdAmount('');
            }
        }
        toggleMode();
    }, [isUsdMode, amount, sourceCurrencyPriceInUsd, setUsdAmount, toggleMode]);

    // --- USD input handler ---

    const handleUsdInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(',', '.');
        // Allow empty, or a valid USD amount: no leading zeros (except "0" itself), up to 2 decimals
        if (value !== '' && !/^(0|[1-9]\d*)\.?\d{0,2}$/.test(value)) return;
        setUsdAmount(value);
        computeAndSetTokenAmount(value);
    }, [setUsdAmount, computeAndSetTokenAmount]);

    return {
        sourceCurrencyPriceInUsd,
        isUsdMode,
        usdAmount,
        handleToggle,
        handleUsdInputChange,
    };
}
