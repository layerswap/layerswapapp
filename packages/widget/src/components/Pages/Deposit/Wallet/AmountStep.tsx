import { FC } from "react";
import { useFormikContext } from "formik";
import { AlertTriangle } from "lucide-react";
import SubmitButton from "@/components/Buttons/submitButton";
import SourcePicker from "@/components/Input/SourcePicker";
import { useQuoteData } from "@/hooks/useFee";
import { useSwapDataState, useSwapDataUpdate } from "@/context/swap";
import { useSelectedAccount } from "@/context/swapAccounts";
import { ErrorDisplay } from "@/components/Pages/Swap/Form/SecondaryComponents/validationError/ErrorDisplay";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
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
    const showReceiveSummary = (!!fee?.quote && !quoteError) || isQuoteLoading;

    return (
        <div className="flex flex-col gap-2 w-full">
            <SourcePicker
                minAllowedAmount={minAllowedAmount}
                maxAllowedAmount={maxAllowedAmount}
                minAllowedAmountInUsd={minAllowedAmountInUsd}
                maxAllowedAmountInUsd={maxAllowedAmountInUsd}
                fee={fee}
                quoteTokenPrices={quoteTokenPrices}
            />

            {quoteError?.message && (
                <div role="alert">
                    <ErrorDisplay
                        icon={<AlertTriangle className="h-5 w-5 text-warning-foreground" />}
                        title="Quote unavailable"
                        message={quoteError.message}
                    />
                </div>
            )}

            {showReceiveSummary && (
                <QuoteSummary
                    receiveAmount={receiveAmount != null ? Number(receiveAmount) : undefined}
                    tokenSymbol={toAsset?.symbol}
                    minUsd={minAllowedAmountInUsd ?? undefined}
                    maxUsd={maxAllowedAmountInUsd ?? undefined}
                    isLoading={isQuoteLoading}
                />
            )}

            <SubmitButton isDisabled={!canContinue} onClick={handleContinue}>
                Continue
            </SubmitButton>
        </div>
    );
};

export default AmountStep;
