import { FC, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { ArrowRight, Check, Circle, CirclePause, CircleX, ExternalLink, Loader2, RotateCcw } from "lucide-react";
import { NetworkRoute, NetworkRouteToken } from "@layerswap/widget-types";
import { SwapDataProvider, useSwapDataState, useSwapDataUpdate } from "@/context/swap";
import { useCallbacks } from "@/context/callbackProvider";
import { useSelectedAccount } from "@/context/swapAccounts";
import { useResolvedSwapStatus } from "@/hooks/useResolvedSwapStatus";
import { useSwapRetry } from "@/hooks/useSwapRetry";
import useWallet from "@/hooks/useWallet";
import { Partner } from "@/Models/Partner";
import { DepositAction, TransactionType } from "@/lib/apiClients/layerSwapApiClient";
import { getExplorerUrl } from "@/lib/address/explorerUrl";
import { lifecycleContextFromSwap } from "@/lib/swapLifecycle";
import { SwapPhase } from "@/components/utils/swapPhase";
import { hasUnacknowledgedWalletAction } from "@/helpers/swapProgress";
import { buildLegFormValues, ConsolidationDestination, ConsolidationLeg, deriveLegStatus, LegStatus, phaseOutcome } from "@/helpers/consolidation";
import { useConsolidationStore } from "@/stores/consolidationStore";
import { useDepositSignatureStore, useGaslessAuthorizationStore, useSwapTransactionStore } from "@/stores/swapTransactionStore";
import { useGaslessPreferenceStore } from "@/stores/gaslessPreferenceStore";
import { useBalanceStore } from "@/stores/balanceStore";
import { Page2Controller } from "../Withdraw/Page2Controller";
import { RetryView } from "../Withdraw/Presentation/RetryView";
import { SwapQuoteDetails } from "../Withdraw/SwapQuoteDetails";
import WarningMessage from "@/components/Common/WarningMessage";
import SecondaryButton from "@/components/Buttons/secondaryButton";
import { WalletActionTransition } from "../Withdraw/Presentation/WalletActionTransition";
import { isUserRejection } from "../Withdraw/Wallet/Common/isUserRejection";
import { SwapFormValues } from "../Form/SwapFormValues";
import { formatMinutes } from "./ConsolidationQuoteDetails";
import { formatAmount, TokenLogo } from "./parts";

export type LegReport = {
    status: LegStatus;
    outputAmount?: number;
    expectedReceive?: number;
    feesUsd?: number;
    avgCompletionTime?: string;
    busy: boolean;
};

type LegRoute = { from: NetworkRoute, fromAsset: NetworkRouteToken };

type Props = {
    recordId: string;
    leg: ConsolidationLeg;
    route: LegRoute | undefined;
    destination: ConsolidationDestination | undefined;
    active: boolean;
    canExecute: boolean;
    footerSlot: HTMLElement | null;
    quoteSlot: HTMLElement | null;
    /** Only once nothing else is waiting, since retrying makes this token the current one again. */
    canRetry: boolean;
    partner?: Partner;
    onReport: (legId: string, report: LegReport) => void;
};

// An unfunded swap can expire; that is not a submission.
const UNSUBMITTED_PHASES: ReadonlySet<SwapPhase> = new Set([SwapPhase.AwaitingUserDeposit, SwapPhase.Expired]);

/** One token of the send: its own swap, its row, and the wallet button in the footer while it is next. */
const LegStep: FC<Props> = (props) => {
    const { leg, route, destination } = props;
    if (!leg.swapId && !(route && destination)) {
        return <LegRowView leg={leg} route={route} status={leg.state === "cancelled" ? "stopped" : "unavailable"} />;
    }
    return (
        <SwapDataProvider>
            <LegSwap {...props} />
        </SwapDataProvider>
    );
};

const LegSwap: FC<Props> = ({ recordId, leg, route, destination, active, canExecute, footerSlot, quoteSlot, canRetry, partner, onReport }) => {
    const { setSwapId, setSubmitedFormValues } = useSwapDataUpdate();
    const { swapId, swapDetails, inputTransactionStatus, gaslessAuthorization, depositActionsResponse, quote, walletActionFeedback } = useSwapDataState();
    const resolved = useResolvedSwapStatus();
    const account = useSelectedAccount("from", leg.network);
    const { wallets } = useWallet(route?.from, "withdrawal");
    const wallet = wallets.find(w => w.id === account?.id);
    const [initialized, setInitialized] = useState(false);

    const legValues = useMemo(() => route && destination
        ? buildLegFormValues({ ...route, amount: leg.amount }, destination)
        : undefined, [route, destination, leg.amount]);

    useEffect(() => {
        // Also clears a swap id the provider seeded from initial settings.
        setSwapId(leg.swapId);
        if (!leg.swapId && legValues) setSubmitedFormValues(legValues);
        setInitialized(true);
    }, []);

    useEffect(() => {
        if (initialized && swapId && swapId !== leg.swapId) {
            useConsolidationStore.getState().setLegSwapId(recordId, leg.id, swapId);
        }
    }, [initialized, swapId]);

    const transaction = useSwapTransactionStore(s => swapId ? s.swapTransactions[swapId] : undefined);
    const pendingSubmission = useSwapTransactionStore(s => swapId ? !!s.pendingSubmissions[swapId] : false);
    const authorizationReceipt = useGaslessAuthorizationStore(s => swapId ? s.authorizations[swapId] : undefined);
    const signatureReceipt = useDepositSignatureStore(s => swapId ? s.signatures[swapId] : undefined);
    const unacknowledged = !!swapId && hasUnacknowledgedWalletAction({
        transaction, pendingSubmission, authorizationReceipt, signatureReceipt,
        transactionStatus: inputTransactionStatus, gaslessAuthorization, depositActions: depositActionsResponse,
    });
    const loaded = initialized && !!swapId && swapDetails?.id === swapId;
    const submitted = initialized && !!swapId
        && (unacknowledged || (loaded && !UNSUBMITTED_PHASES.has(resolved.phase) && !resolved.failureReason));
    const busy = !!walletActionFeedback?.loading;
    const walletError = !busy ? walletActionFeedback?.error : undefined;

    const advance = useCallback(() => {
        useConsolidationStore.getState().markLegSubmitted(recordId, leg.id);
        // A gasless failure on this leg must not offer "switch to standard" on the next one.
        useGaslessPreferenceStore.getState().clearGaslessUnavailable();
        if (account?.address && route) void useBalanceStore.getState().fetchBalance(account.address, route.from, { ignoreCache: true }).catch(() => undefined);
    }, [recordId, leg.id, account?.address, route]);

    useEffect(() => {
        if (submitted && !busy && leg.state === "pending") advance();
    }, [submitted, busy, leg.state]);

    const outputAmount = resolved.outputReady && loaded
        ? swapDetails?.transactions?.find(t => t.type === TransactionType.Output)?.amount
        : undefined;
    const outcome = loaded ? phaseOutcome(resolved.phase) : undefined;
    useEffect(() => {
        if (outcome) useConsolidationStore.getState().setLegOutcome(recordId, leg.id, outcome, outputAmount);
    }, [outcome, outputAmount]);

    const status = deriveLegStatus({ leg, active, available: true, phase: loaded ? resolved.phase : undefined, submitted });
    const report: LegReport = {
        status,
        outputAmount: outputAmount ?? leg.received,
        expectedReceive: quote?.receive_amount,
        feesUsd: quote?.total_fee_in_usd,
        avgCompletionTime: quote?.avg_completion_time,
        busy: busy || unacknowledged,
    };
    const reportKey = JSON.stringify(report);
    useEffect(() => {
        if (initialized) onReport(leg.id, report);
    }, [initialized, reportKey, onReport]);

    const isCurrent = active && initialized && leg.state === "pending";
    const handleCancel = useCallback(() => useConsolidationStore.getState().cancelLeg(recordId, leg.id), [recordId, leg.id]);
    const handleAdjustAmount = useCallback((updates: SwapFormValues) => {
        if (!legValues || !updates.amount) return;
        // No preset controller runs for a leg, so preset flags must not survive the edit.
        setSubmitedFormValues({
            ...legValues,
            amount: updates.amount,
            amountMode: "fixed",
            amountPresetPending: false,
            amountPresetSource: undefined,
            amountPresetError: undefined,
        });
        useConsolidationStore.getState().setLegAmount(recordId, leg.id, updates.amount);
    }, [legValues, recordId, leg.id]);

    const inputHash = swapDetails?.transactions?.find(t => t.type === TransactionType.Input)?.transaction_hash ?? transaction?.hash;
    const explorerUrl = inputHash ? getExplorerUrl(route?.from.transaction_explorer_template, inputHash) : undefined;
    const asset = route?.fromAsset.asset ?? leg.token;
    const networkName = route?.from.display_name ?? leg.network;
    const onNetwork = !!wallet?.chainId && String(wallet.chainId) === String(route?.from.chain_id);
    const switching = busy && /switch/i.test(walletActionFeedback?.actionStateText ?? "");
    const rejected = !!walletError && isUserRejection(walletError);

    return (
        <>
            <LegRowView
                leg={leg}
                route={route}
                status={status}
                outputAmount={report.outputAmount}
                current={isCurrent}
                activity={!canExecute ? "paused" : busy ? "wallet" : walletError ? (rejected ? "rejected" : "error") : undefined}
                bridgingTime={formatMinutes(quote?.avg_completion_time)}
                explorerUrl={explorerUrl}
            >
                {
                    isCurrent ? (
                        <div className="flex items-end justify-between gap-2 pr-2.5 pb-2">
                            <SubSteps
                                asset={asset}
                                networkName={networkName}
                                onNetwork={onNetwork}
                                switching={switching}
                                actions={depositActionsResponse}
                                busy={busy && !switching}
                                failed={walletError ? (rejected ? "rejected" : "failed") : undefined}
                            />
                            {!report.busy ? <SecondaryButton size="xs" onClick={handleCancel}>Skip</SecondaryButton> : null}
                        </div>
                    ) : status === "refunded" || status === "failed" ? (
                        <div className="flex flex-col gap-2 px-2.5 pb-2">
                            {status === "refunded" ? (
                                <WarningMessage messageType="informing">
                                    {`Bridge failed. ${formatAmount(leg.amount)} ${asset} went back to your wallet on ${networkName}.`}
                                </WarningMessage>
                            ) : null}
                            {canRetry ? (
                                <SecondaryButton size="xs" className="self-end" onClick={() => useConsolidationStore.getState().retryLeg(recordId, leg.id)}>
                                    {`Send ${asset} again`}
                                </SecondaryButton>
                            ) : null}
                        </div>
                    ) : null
                }
            </LegRowView>
            {
                isCurrent && quoteSlot ? createPortal(<ActiveLegQuote partner={partner} />, quoteSlot) : null
            }
            {
                isCurrent && canExecute && footerSlot ? createPortal(
                    <ActiveLegControls
                        partner={partner}
                        onWalletWithdrawalSuccess={advance}
                        onCancelWithdrawal={handleCancel}
                        onAdjustAmount={handleAdjustAmount}
                    />,
                    footerSlot,
                ) : null
            }
        </>
    );
};

/** The quote section `SwapDetails` shows for the swap being confirmed. */
const ActiveLegQuote: FC<{ partner?: Partner }> = ({ partner }) => {
    const { swapBasicData, swapDetails, quote, refuel, quoteIsLoading, quoteError, flow } = useSwapDataState();
    const account = useSelectedAccount("from", swapBasicData?.source_network.name);
    if (!swapBasicData) return null;
    return (
        <SwapQuoteDetails
            swapBasicData={swapBasicData}
            sourceAddress={swapDetails?.source_address || account?.address}
            quote={quote}
            refuel={refuel}
            quoteIsLoading={quoteIsLoading}
            quoteError={quoteError}
            partner={partner}
            compact={flow.compactQuote}
        />
    );
};

/** The wallet controls `SwapDetails` would show, without its summary and quote sections. */
const ActiveLegControls: FC<{
    partner?: Partner;
    onWalletWithdrawalSuccess: () => void;
    onCancelWithdrawal: () => void;
    onAdjustAmount: (updates: SwapFormValues) => void;
}> = ({ partner, onWalletWithdrawalSuccess, onCancelWithdrawal, onAdjustAmount }) => {
    const { swapBasicData, swapDetails } = useSwapDataState();
    const { setSwapViewMounted } = useSwapDataUpdate();
    const { onSwapLifecycle } = useCallbacks();
    const resolved = useResolvedSwapStatus();
    const { failureReason, canRetry, retry, canSwitchToStandard, switchToStandard } = useSwapRetry();

    // The provider refreshes deposit actions only while a swap view is on screen.
    useEffect(() => {
        setSwapViewMounted(true);
        return () => setSwapViewMounted(false);
    }, [setSwapViewMounted]);

    const requestRetry = (reasonCode: string, action: () => void) => {
        if (swapBasicData) onSwapLifecycle({
            step: 'retry_requested', stage: 'swap', outcome: 'started', path: 'ConsolidationLeg',
            reasonCode, ...lifecycleContextFromSwap(swapBasicData, swapDetails),
        });
        action();
    };

    if (!swapBasicData) return null;

    return (
        <Page2Controller
            swapBasicData={swapBasicData}
            type="contained"
            partner={partner}
            onWalletWithdrawalSuccess={onWalletWithdrawalSuccess}
            onCancelWithdrawal={onCancelWithdrawal}
            onAdjustAmount={onAdjustAmount}
        >
            {model => resolved.showWithdrawScreen ? (
                <WalletActionTransition actionKey={model.actionKey}>
                    <div className="flex flex-col gap-2">{model.footer}</div>
                </WalletActionTransition>
            ) : canRetry ? (
                <RetryView
                    canSwitchToStandard={canSwitchToStandard}
                    onRetry={() => requestRetry(failureReason || 'swap_retry', retry)}
                    onSwitchToStandard={() => requestRetry('switch_to_standard_transfer', switchToStandard)}
                />
            ) : null}
        </Page2Controller>
    );
};

type StepState = "done" | "current" | "todo" | "failed";

const actionLabel = (action: DepositAction, asset: string) => {
    const step = action.step ?? "";
    if (step.startsWith("approve")) return `Approve ${asset}`;
    if (step === "sign") return `Sign ${asset}`;
    return `Send ${asset}`;
};

const SubSteps: FC<{
    asset: string;
    networkName: string;
    onNetwork: boolean;
    switching: boolean;
    actions: DepositAction[] | undefined;
    busy: boolean;
    failed?: "rejected" | "failed";
}> = ({ asset, networkName, onNetwork, switching, actions, busy, failed }) => {
    const labelled = (actions ?? []).filter(action => action.step).map(action => ({ label: actionLabel(action, asset), completed: action.status === "completed" }))
        .filter((step, index, all) => index === 0 || all[index - 1].label !== step.label);
    const workflow = labelled.length ? labelled : [{ label: `Send ${asset}`, completed: false }];
    const current = onNetwork ? workflow.findIndex(step => !step.completed) : -1;
    const steps: { label: string, state: StepState, suffix?: string }[] = [
        { label: onNetwork ? `On ${networkName}` : `Switch to ${networkName}`, state: onNetwork ? "done" : switching ? "current" : "todo" },
        ...workflow.map((step, index) => ({
            label: step.label,
            state: (step.completed ? "done" : index === current ? (failed ? "failed" : busy ? "current" : "todo") : "todo") as StepState,
            suffix: index === current && failed === "rejected" ? "rejected" : undefined,
        })),
    ];
    return (
        <ol className="list-none m-0 pl-14 flex flex-col gap-1.5 text-sm leading-5">
            {steps.map(step => (
                <li key={step.label} className={clsx("flex items-center gap-2", {
                    "text-secondary-text": step.state === "done" || step.state === "todo",
                    "text-primary-text": step.state === "current",
                    "text-error-foreground": step.state === "failed",
                })}>
                    {step.state === "done" ? <Check className="w-3.5 h-3.5 text-success-foreground" strokeWidth={2} />
                        : step.state === "current" ? <Loader2 className="w-3.5 h-3.5 text-primary-100 animate-spin" />
                            : step.state === "failed" ? <CircleX className="w-3.5 h-3.5" />
                                : <Circle className="w-3.5 h-3.5" />}
                    <span>{step.label}</span>
                    {step.suffix ? <span className="text-secondary-text">{`· ${step.suffix}`}</span> : null}
                </li>
            ))}
        </ol>
    );
};

type Activity = "wallet" | "rejected" | "error" | "paused";

export const LegRowView: FC<{
    leg: ConsolidationLeg;
    route: LegRoute | undefined;
    status: LegStatus;
    outputAmount?: number;
    current?: boolean;
    activity?: Activity;
    bridgingTime?: string;
    explorerUrl?: string;
    children?: ReactNode;
}> = ({ leg, route, status, outputAmount, current, activity, bridgingTime, explorerUrl, children }) => {
    const asset = route?.fromAsset.asset ?? leg.token;
    const networkName = route?.from.display_name ?? leg.network;
    const row = (
        <div className="flex items-center gap-3 p-2.5">
            <TokenLogo tokenLogo={route?.fromAsset.logo} networkLogo={route?.from.logo} size={32} ring={current ? "border-secondary-400" : "border-secondary-500"} />
            <div className="flex-1 min-w-0">
                <div className="text-base leading-6 font-medium text-primary-text truncate">{asset}</div>
                <div className="text-xs leading-4 text-secondary-text truncate">{networkName}</div>
            </div>
            <div className="text-right">
                <div className="text-base leading-6 text-primary-text">{formatAmount(leg.amount)}</div>
                <StatusLine status={status} current={current} activity={activity} outputAmount={outputAmount} bridgingTime={bridgingTime} explorerUrl={explorerUrl} />
            </div>
        </div>
    );
    return current ? <div className="rounded-xl bg-secondary-400" aria-current="step">{row}{children}</div> : <>{row}{children}</>;
};

const StatusLine: FC<{ status: LegStatus, current?: boolean, activity?: Activity, outputAmount?: number, bridgingTime?: string, explorerUrl?: string }> = ({ status, current, activity, outputAmount, bridgingTime, explorerUrl }) => {
    const line = (className: string, icon: ReactNode, text: string, link?: "muted" | "inherit") => {
        const content = (
            <>
                {icon}
                <span>{text}</span>
                {link && explorerUrl ? <ExternalLink className={clsx("w-3 h-3", { "text-secondary-text": link === "muted" })} /> : null}
            </>
        );
        const classes = clsx("flex items-center justify-end gap-1 text-xs leading-4 no-underline", className);
        return link && explorerUrl
            ? <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className={classes}>{content}</a>
            : <div className={classes}>{content}</div>;
    };

    if (current && status === "awaiting_confirmation") {
        if (activity === "paused") return line("text-warning-foreground", <CirclePause className="w-3 h-3" />, "Paused");
        if (activity === "rejected") return line("text-error-foreground", null, "Rejected in wallet");
        if (activity === "error") return line("text-error-foreground", null, "Failed in wallet");
        if (activity === "wallet") return line("text-primary-100", null, "In your wallet");
        return line("text-primary-100", <ArrowRight className="w-3 h-3" />, "Next");
    }
    switch (status) {
        case "submitted": return line("text-primary-text", <Loader2 className="w-3 h-3 text-primary-100 animate-spin" />, bridgingTime ? `Bridging · ${bridgingTime}` : "Bridging", "muted");
        case "delivered": return line("text-success-foreground", <Check className="w-3 h-3" />, outputAmount != null ? `Received ${formatAmount(outputAmount)}` : "Received", "inherit");
        case "refunded": return line("text-warning-foreground", <RotateCcw className="w-3 h-3" />, "Refunded", "inherit");
        case "failed": return line("text-error-foreground", <CircleX className="w-3 h-3" />, "Failed", "inherit");
        case "stopped": return line("text-secondary-text", null, "Not sent");
        case "unavailable": return line("text-warning-foreground", null, "Unavailable");
        default: return line("text-secondary-text", null, "Waiting");
    }
};

export default LegStep;
