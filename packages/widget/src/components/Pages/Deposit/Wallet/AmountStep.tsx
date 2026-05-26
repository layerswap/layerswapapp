import { FC, useState } from "react";
import { useFormikContext } from "formik";
import { AlertTriangle } from "lucide-react";
import SubmitButton from "@/components/Buttons/submitButton";
import AmountField from "@/components/Input/Amount";
import MinMax from "@/components/Input/Amount/MinMax";
import RoutePicker from "@/components/Input/RoutePicker";
import { useQuoteData } from "@/hooks/useFee";
import { useSwapDataState, useSwapDataUpdate } from "@/context/swap";
import { ErrorDisplay } from "@/components/Pages/Swap/Form/SecondaryComponents/validationError/ErrorDisplay";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import { useDepositStep } from "../depositStepContext";
import QuoteSummary from "../_shared/QuoteSummary";

const AmountStep: FC = () => {
    const { values, setFieldValue } = useFormikContext<SwapFormValues>();
    const { push } = useDepositStep();
    const { setSwapId, setSubmitedFormValues } = useSwapDataUpdate();
    const { setSwapError } = useSwapDataState();

    const from = values?.from as NetworkRoute | undefined;
    const fromAsset = values?.fromAsset as NetworkRouteToken | undefined;
    const to = values?.to as NetworkRoute | undefined;
    const toAsset = values?.toAsset as NetworkRouteToken | undefined;

    // Quote + limits — same hook the Swap form uses. Drives AmountField's
    // preview, MinMax bounds, and the Continue button's disabled state.
    const {
        quote: fee,
        minAllowedAmount,
        maxAllowedAmount,
        minAllowedAmountInUsd,
        maxAllowedAmountInUsd,
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

    // MinMax → AmountField hover-preview coordination, mirrors SourcePicker.
    const [actionTempValue, setActionTempValue] = useState<number | undefined>(undefined);
    const [actionTempUsdValue, setActionTempUsdValue] = useState<string | undefined>(undefined);
    const handleActionHover = (value: number | undefined, usdValue?: string) => {
        setActionTempValue(value);
        setActionTempUsdValue(usdValue);
    };

    const amountNum = Number(values?.amount);
    const hasAmount = Number.isFinite(amountNum) && amountNum > 0;
    const canContinue = !!from && !!fromAsset && !!to && !!toAsset && !!values?.destination_address && hasAmount && !quoteError && !isQuoteLoading;

    const handleContinue = () => {
        if (!canContinue) return;
        // Belt+suspenders: SwapDataProvider.setSubmitedFormValues throws
        // "Form data is missing" if amount is empty on the wallet flow.
        if (!values?.amount) return;
        // Hand off to the existing wallet-withdraw + processing machinery.
        // `setSubmitedFormValues` populates `swapBasicData` in the SwapDataProvider
        // so `<SwapDetails type="contained" />` can render Withdraw + Processing
        // — the source/destination/ETA/breakdown and the chain-specific
        // "sign transaction" CTA all live there.
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
            {/* Source picker — reuses the same RoutePicker the Swap form uses,
                so suggestions, balances, search and loading are inherited. */}
            <div className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-sm text-secondary-text tracking-wide">Send from</span>
                <div className="flex-1 min-w-0">
                    <RoutePicker
                        direction="from"
                        minAllowedAmount={minAllowedAmount}
                        maxAllowedAmount={maxAllowedAmount}
                        quote={fee?.quote}
                        hideBalance
                    />
                </div>
            </div>

            {/* Amount field with USD/token toggle + Min/50%/Max chips —
                reuses the same components mounted by the Swap form's SourcePicker. */}
            <div className="bg-secondary-500 rounded-2xl p-4 group/source flex flex-col gap-3">
                {from && fromAsset && (
                    <MinMax
                        from={from}
                        fromCurrency={fromAsset}
                        limitsMinAmount={minAllowedAmount}
                        limitsMaxAmount={maxAllowedAmount}
                        limitsMinAmountInUsd={minAllowedAmountInUsd}
                        limitsMaxAmountInUsd={maxAllowedAmountInUsd}
                        onActionHover={handleActionHover}
                        depositMethod="wallet"
                    />
                )}
                <AmountField
                    fee={fee}
                    actionValue={actionTempValue}
                    actionValueUsd={actionTempUsdValue}
                    showToggle
                />
            </div>

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
