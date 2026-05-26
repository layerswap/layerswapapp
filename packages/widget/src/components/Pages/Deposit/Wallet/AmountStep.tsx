import { FC, useMemo, useState } from "react";
import { useFormikContext } from "formik";
import SubmitButton from "@/components/Buttons/submitButton";
import AmountField from "@/components/Input/Amount";
import MinMax from "@/components/Input/Amount/MinMax";
import { Selector, SelectorContent, SelectorTrigger } from "@/components/Select/Selector/Index";
import { Content } from "@/components/Input/RoutePicker/Content";
import { SelectedRouteDisplay } from "@/components/Input/RoutePicker/Routes";
import { groupRoutes } from "@/hooks/useFormRoutes";
import useDepositAddressAvailableRoutes from "@/hooks/useDepositAddressAvailableRoutes";
import useAllWithdrawalBalances from "@/hooks/useAllWithdrawalBalances";
import { useRecentNetworksStore } from "@/stores/recentRoutesStore";
import { useRouteSortingStore } from "@/stores/routeSortingStore";
import { useQuoteData } from "@/hooks/useFee";
import { useSwapDataState, useSwapDataUpdate } from "@/context/swap";
import { formatTokenAmount } from "@/components/utils/formatTokenAmount";
import { formatUsd } from "@/components/utils/formatUsdAmount";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import { useDepositStep } from "../depositStepContext";

const AmountStep: FC = () => {
    const { values, setFieldValue } = useFormikContext<SwapFormValues>();
    const { push } = useDepositStep();
    const { setSwapId, setSubmitedFormValues } = useSwapDataUpdate();
    const { setSwapError } = useSwapDataState();

    const from = values?.from as NetworkRoute | undefined;
    const fromAsset = values?.fromAsset as NetworkRouteToken | undefined;
    const to = values?.to as NetworkRoute | undefined;
    const toAsset = values?.toAsset as NetworkRouteToken | undefined;

    // Reuse the existing route-picker UI for source selection so we inherit
    // search, grouping, recent routes and balance display for free.
    const [searchQuery, setSearchQuery] = useState("");
    const sortingOption = useRouteSortingStore((s) => s.sortingOption);
    const routesHistory = useRecentNetworksStore((s) => s.recentRoutes);
    const { availableRoutes } = useDepositAddressAvailableRoutes(to?.name, toAsset?.symbol);
    const { balances } = useAllWithdrawalBalances();
    const routeElements = useMemo(() => groupRoutes({
        routes: availableRoutes,
        direction: "from",
        balances,
        groupBy: "token",
        recents: routesHistory,
        balancesLoaded: !!balances,
        search: searchQuery,
        suggestionsLimit: 4,
        sortingOption,
    }), [availableRoutes, balances, searchQuery, routesHistory, sortingOption]);

    // Quote + limits — drives AmountField's preview, MinMax bounds, and the
    // Continue button's disabled state. Same hook the Swap form uses.
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
    const canContinue = !!from && !!fromAsset && !!to && !!toAsset && hasAmount && !quoteError && !isQuoteLoading;

    const handleContinue = () => {
        if (!canContinue) return;
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

    return (
        <div className="flex flex-col gap-4 w-full">
            {/* Source picker — same Selector + Content used by PayFromPicker */}
            <div className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-sm text-secondary-text tracking-wide">Send from</span>
                <div className="flex-1 min-w-0">
                    <Selector>
                        <SelectorTrigger
                            disabled={availableRoutes.length === 0}
                            className="bg-secondary-500 hover:bg-secondary-400/70 rounded-xl px-3.5 py-3 transition-colors"
                        >
                            <SelectedRouteDisplay
                                route={from}
                                token={fromAsset}
                                placeholder="Select source token"
                            />
                        </SelectorTrigger>
                        <SelectorContent isLoading={false}>
                            {({ closeModal }) => (
                                <Content
                                    onSelect={(r, t) => {
                                        setFieldValue("from", r, false);
                                        setFieldValue("fromAsset", t, true);
                                        setFieldValue("amount", "", true);
                                        closeModal();
                                    }}
                                    searchQuery={searchQuery}
                                    setSearchQuery={setSearchQuery}
                                    rowElements={routeElements}
                                    direction="from"
                                    selectedRoute={from?.name}
                                    selectedToken={fromAsset?.symbol}
                                    hideTokenSwitch
                                />
                            )}
                        </SelectorContent>
                    </Selector>
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
                <div className="text-center text-sm text-warning-foreground">{quoteError.message}</div>
            )}

            {receiveAmount != null && toAsset && !quoteError && (
                <div className="text-center text-secondary-text text-sm">
                    You will receive ~{formatTokenAmount(Number(receiveAmount))} {toAsset.symbol}
                    {minAllowedAmountInUsd != null && (
                        <span className="text-secondary-text/60 ml-1">
                            · min {formatUsd(minAllowedAmountInUsd)}
                        </span>
                    )}
                </div>
            )}

            <SubmitButton isDisabled={!canContinue} onClick={handleContinue}>
                Continue
            </SubmitButton>
        </div>
    );
};

export default AmountStep;
