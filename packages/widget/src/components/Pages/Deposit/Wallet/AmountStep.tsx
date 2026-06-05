import { FC } from "react";
import { useFormikContext } from "formik";
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
    const { push, back } = useDepositStep();
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
        <div className="flex flex-col gap-3 w-full flex-1 min-h-0 justify-between">
            <div className="flex flex-col items-center gap-3 w-full">
                <SourcePicker
                    minAllowedAmount={minAllowedAmount}
                    maxAllowedAmount={maxAllowedAmount}
                    minAllowedAmountInUsd={minAllowedAmountInUsd}
                    maxAllowedAmountInUsd={maxAllowedAmountInUsd}
                    fee={fee}
                    quoteTokenPrices={quoteTokenPrices}
                    hideManualTransfer
                    onRoutePickerTriggerClick={back}
                />

                {(hasQuote || isQuoteLoading) ? (
                    <QuoteSummary
                        receiveAmount={receiveAmount != null ? Number(receiveAmount) : undefined}
                        tokenSymbol={toAsset?.symbol}
                        token={toAsset}
                        isLoading={isQuoteLoading}
                    />
                ) : <></>}

                {(hasQuote || isQuoteLoading) ? (
                    <QuoteDetails
                        swapValues={values}
                        quote={fee?.quote}
                        reward={fee?.reward}
                        isQuoteLoading={isQuoteLoading}
                    />
                ) : <></>}
            </div>

            <SubmitButton isDisabled={!canContinue} onClick={handleContinue}>
                {submitLabel}
            </SubmitButton>
        </div>
    );
};

export default AmountStep;