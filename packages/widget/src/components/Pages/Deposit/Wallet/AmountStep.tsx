import { FC } from "react";
import { useFormikContext } from "formik";
import { AlertTriangle } from "lucide-react";
import SubmitButton from "@/components/Buttons/submitButton";
import SourcePicker from "@/components/Input/SourcePicker";
import { useQuoteData } from "@/hooks/useFee";
import { useSwapDataState, useSwapDataUpdate } from "@/context/swap";
import { useSelectedAccount } from "@/context/swapAccounts";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import QuoteDetails from "@/components/Pages/Swap/Form/FeeDetails";
import { useDepositStep } from "../depositStepContext";
import QuoteSummary from "../_shared/QuoteSummary";

const AmountStep: FC = () => {
    const { values, setFieldValue } = useFormikContext<SwapFormValues>();
    const { push } = useDepositStep();
    const { setSwapId, setSubmitedFormValues } = useSwapDataUpdate();
    const { setSwapError } = useSwapDataState();

    const from = values?.from;
    const fromAsset = values?.fromAsset;
    const to = values?.to;
    const toAsset = values?.toAsset;
    const sourceAccount = useSelectedAccount("from", from?.name);

    const {
        quote: fee,
        minAllowedAmount,
        maxAllowedAmount,
        minAllowedAmountInUsd,
        maxAllowedAmountInUsd,
        quoteTokenPrices,
        isQuoteLoading,
        quoteError,
    } = useQuoteData(
        from && fromAsset && to && toAsset
            ? {
                from: from.name,
                to: to.name,
                fromCurrency: fromAsset.symbol,
                toCurrency: toAsset.symbol,
                amount: values?.amount,
                refuel: !!values?.refuel,
                depositMethod: "wallet",
            }
            : undefined,
    );

    const amountNum = Number(values?.amount);
    const hasAmount = Number.isFinite(amountNum) && amountNum > 0;
    const hasQuote = !!fee?.quote && !quoteError;
    const canContinue = !!from && !!fromAsset && !!to && !!toAsset && !!sourceAccount?.address && !!values?.destination_address && hasAmount && !quoteError && !isQuoteLoading;

    const handleContinue = () => {
        if (!canContinue) return;
        if (!values?.amount) return;
        if (setSwapError) setSwapError("");
        setFieldValue("depositMethod", "wallet", false);
        setSubmitedFormValues({ ...values, depositMethod: "wallet" });
        setSwapId(undefined);
        push("wallet-processing");
    };

    const receiveAmount = fee?.quote?.receive_amount;

    const submitLabel = isQuoteLoading
        ? "Fetching best route…"
        : quoteError
            ? "Choose a supported token"
            : !hasAmount
                ? "Enter an amount"
                : "Continue";

    return (
        <div className="flex flex-col gap-3 w-full">
            <SourcePicker
                minAllowedAmount={minAllowedAmount}
                maxAllowedAmount={maxAllowedAmount}
                minAllowedAmountInUsd={minAllowedAmountInUsd}
                maxAllowedAmountInUsd={maxAllowedAmountInUsd}
                fee={fee}
                quoteTokenPrices={quoteTokenPrices}
                hideManualTransfer
            />

            {quoteError && (
                <FriendlyRouteError
                    fromSymbol={fromAsset?.symbol}
                    fromChain={from?.display_name}
                    toSymbol={toAsset?.symbol}
                    toChain={to?.display_name}
                />
            )}

            {(hasQuote || isQuoteLoading) && (
                <QuoteSummary
                    receiveAmount={receiveAmount != null ? Number(receiveAmount) : undefined}
                    tokenSymbol={toAsset?.symbol}
                    network={to}
                    token={toAsset}
                    isLoading={isQuoteLoading}
                />
            )}

            {(hasQuote || isQuoteLoading) && (
                <QuoteDetails
                    swapValues={values}
                    quote={fee?.quote}
                    reward={fee?.reward}
                    isQuoteLoading={isQuoteLoading}
                />
            )}

            <SubmitButton isDisabled={!canContinue} onClick={handleContinue}>
                {submitLabel}
            </SubmitButton>
        </div>
    );
};

type ErrorProps = {
    fromSymbol?: string;
    fromChain?: string;
    toSymbol?: string;
    toChain?: string;
};

const FriendlyRouteError: FC<ErrorProps> = ({ fromSymbol, fromChain, toSymbol, toChain }) => {
    const pair = fromSymbol && fromChain && toSymbol && toChain
        ? `${fromSymbol} on ${fromChain} to ${toSymbol} on ${toChain}`
        : "this pair";
    return (
        <div role="alert" className="bg-secondary-500 rounded-2xl p-4 flex gap-3">
            <span className="shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-full bg-warning-background/50 text-warning-foreground">
                <AlertTriangle className="h-4 w-4" />
            </span>
            <div className="flex flex-col gap-1 min-w-0">
                <span className="text-primary-text text-[15px] font-semibold">
                    Route not available for this pair
                </span>
                <span className="text-secondary-text text-[13px] leading-snug">
                    We can&apos;t bridge {pair} right now. Try a different source
                    token or chain to continue.
                </span>
            </div>
        </div>
    );
};

export default AmountStep;
