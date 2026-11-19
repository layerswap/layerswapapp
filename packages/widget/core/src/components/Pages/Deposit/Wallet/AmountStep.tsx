import { isAmountPreset } from '@/lib/amountPresets';
import { FC, useCallback, useState } from "react";
import { useFormikContext } from "formik";
import SubmitButton from "@/components/Buttons/submitButton";
import SourcePicker from "@/components/Input/SourcePicker";
import { useQuoteData } from "@/hooks/useFee";
import { useSelectedAccount } from "@/context/swapAccounts";
import { useValidationContext } from "@/context/validationContext";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import QuoteDetails from "@/components/Pages/Swap/Form/FeeDetails";
import { useDepositStep } from "../depositStepContext";
import QuoteSummary from "../_shared/QuoteSummary";
import { useCheckSwapPrerequisites, useSwapPrerequisites } from "@/hooks/useSwapPrerequisites";
import { prerequisitesFromForm } from "@/lib/prerequisites/context";
import { PrerequisitePanel } from "@/components/SwapPrerequisites/PrerequisitePanel";

const AmountStep: FC = () => {
    const { values, setFieldValue, submitForm } = useFormikContext<SwapFormValues>();
    const { back } = useDepositStep();

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
        isQuoteLoading: quoteLoading,
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

    const isQuoteLoading = quoteLoading || (isAmountPreset(values.amountMode) && !!values.amountPresetPending);
    const { formValidation } = useValidationContext();
    const prerequisites = useSwapPrerequisites(prerequisitesFromForm(values));
    const checkPrerequisites = useCheckSwapPrerequisites();
    const [isCheckingSetup, setIsCheckingSetup] = useState(false);
    const [setupError, setSetupError] = useState<string>();

    const receiveAmount = fee?.quote?.receive_amount;
    const hasQuote = !!fee?.quote && !quoteError;
    const isValid = !formValidation.message;
    const canContinue = isValid && hasQuote && !isQuoteLoading && !!sourceAccount?.address && prerequisites.isReady;

    // Submitting through Formik lets the owning SwapForm (Wallet/index.tsx)
    // report form_submitted and move to the processing step.
    const handleContinue = useCallback(async () => {
        if (!canContinue || !values?.amount || isCheckingSetup) return;
        setSetupError(undefined);
        setIsCheckingSetup(true);
        try {
            await checkPrerequisites(prerequisitesFromForm(values, receiveAmount));
        } catch (error) {
            setSetupError(error instanceof Error ? error.message : "Could not check account setup");
            return;
        } finally {
            setIsCheckingSetup(false);
        }
        setFieldValue("depositMethod", "wallet", false);
        submitForm();
    }, [canContinue, values, isCheckingSetup, receiveAmount, checkPrerequisites, setFieldValue, submitForm]);

    const destinationPriceInUsd = fee?.quote?.destination_token?.price_in_usd;
    const receiveAmountInUsd =
        receiveAmount != null && destinationPriceInUsd
            ? Number(receiveAmount) * destinationPriceInUsd
            : undefined;

    const submitLabel = isQuoteLoading
        ? "Fetching best route…"
        : formValidation.message || prerequisites.blockingMessage || "Continue";

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
                        receiveAmountInUsd={receiveAmountInUsd}
                        tokenSymbol={toAsset?.asset}
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

                <PrerequisitePanel state={prerequisites} />
            </div>

            {setupError && <p role="alert" className="text-sm text-secondary-text">{setupError}</p>}
            <SubmitButton isDisabled={!canContinue} isSubmitting={isCheckingSetup} onClick={handleContinue}>
                {submitLabel}
            </SubmitButton>
        </div>
    );
};

export default AmountStep;
