import { widgetTelemetry } from '@/lib/widgetTelemetry';
import { ceilToDecimals, truncateDecimals } from '@/components/utils/RoundDecimals';
import { Widget } from '@/components/Widget/Index';
import { useSettingsState } from '@/context/settings';
import { useSwapDataState, useSwapDataUpdate } from '@/context/swap';
import { useSelectedAccount } from '@/context/swapAccounts';
import { isDepositAddressSwap } from '@/helpers/swapFlow';
import { transformSwapDataToQuoteArgs, useQuoteData } from '@/hooks/useFee';
import { useBalance } from '@/lib/balances/useBalance';
import useOutOfGas from '@/lib/gases/useOutOfGas';
import useSWRGas from '@/lib/gases/useSWRGas';
import { amountPresetGasFloorScope, amountPresetSource, isAmountPreset, resolveDepositFeeAdjustedAmount } from '@/lib/amountPresets';
import { formatTokenAmount } from '@/components/utils/formatTokenAmount';
import type { JSX } from 'react';
import { FC, useCallback, useEffect, useMemo, useRef } from 'react';
import { AdjustAmountButton } from '../Form/SecondaryComponents/validationError/AdjustAmountButton';
import { RefreshBalanceButton } from '../Form/SecondaryComponents/validationError/RefreshBalanceButton';
import type { SwapFormValues } from '../Form/SwapFormValues';
import {
    BalanceWarningView,
    GasWarningView,
} from './Presentation/BalanceWarningView';
import WalletTransferButton from './WalletTransferButton';
import { WalletActionTransition } from './Presentation/WalletActionTransition';
import { lifecycleContextFromSwap } from '@/lib/swapLifecycle';
import { TransferBlock } from './TransferBlock';
import { useHasSubmittedTransfer } from '@/hooks/useHasSubmittedTransfer';
import { type ObservedLifecycleEvent, useLifecycleObservation } from '@/hooks/useLifecycleObservation';
import { resolveDepositGasTransaction } from '@/helpers/depositActions';
import { isGaslessDepositWorkflow } from '@/helpers/gasless';
import { useIsGaslessActive } from '@/hooks/useIsGaslessActive';
import { useSelectedSourceWallet } from '@/hooks/useSelectedSourceWallet';

// "Transfer screen shown": reported once while the screen is visible, before any swap exists.
const AWAITING_WALLET_ACTION: ObservedLifecycleEvent = {
    step: 'awaiting_wallet_action',
    stage: 'wallet_action',
    outcome: 'pending',
    path: 'Withdraw',
    action: 'send_from_wallet',
}

export function useWithdrawBalance(active = true, adjustFormAmount?: (updates: SwapFormValues) => void) {
    const { swapBasicData, swapDetails, swapId, amountPresetLocked, depositActionsResponse, refuel, quoteIsLoading, presetRevisionProposal } =
        useSwapDataState();
    const { startFreshSwapAttempt, canAdjustAmount, recordDepositGasFloor } = useSwapDataUpdate();
    const hasSubmittedTransfer = useHasSubmittedTransfer();
    const draftGasless = useIsGaslessActive(swapBasicData);
    // Created swaps follow their execution plan even if the draft preference changed.
    const isGaslessExecution = isGaslessDepositWorkflow(depositActionsResponse) ?? draftGasless;

    const { networks, sourceRoutes, destinationRoutes } = useSettingsState();
    const source_network =
        swapBasicData?.source_network &&
        networks.find((n) => n.name === swapBasicData?.source_network?.name);
    const selectedSourceAccount = useSelectedAccount(
        'from',
        source_network?.name,
    );

    const { balances, mutate, isLoading } = useBalance(
        active ? selectedSourceAccount?.address : undefined,
        source_network,
        { refreshInterval: 20000, dedupeInterval: 20000 },
    );
    const walletBalance =
        source_network &&
        balances?.find(
            (b) =>
                b?.network === source_network?.name &&
                b?.token === swapBasicData?.source_token?.symbol,
        );
    const walletBalanceAmount = walletBalance?.amount;
    const deposit = swapBasicData && source_network
        ? resolveDepositGasTransaction(depositActionsResponse, { network: source_network, token: swapBasicData.source_token.symbol, address: selectedSourceAccount?.address })
        : undefined;
    const resolvedTransaction = deposit?.transaction;
    // The estimate's effect and hook options compare the payload by identity.
    const gasTransaction = useMemo(() => resolvedTransaction,
        [resolvedTransaction?.recipientAddress, resolvedTransaction?.callData, resolvedTransaction?.amountInBaseUnits]);
    const gasEstimationAmount = gasTransaction ? deposit?.action.amount : swapBasicData?.requested_amount;
    const currentPresetSource = amountPresetSource(
        swapBasicData?.source_network.name, swapBasicData?.source_token.symbol,
        selectedSourceAccount?.id, selectedSourceAccount?.address,
    );
    const livePreset = !swapId && !amountPresetLocked && isAmountPreset(swapBasicData?.amountMode)
        && swapBasicData?.amountPresetSource === currentPresetSource;
    const sourceWallet = useSelectedSourceWallet(source_network || undefined);
    const { gasData: estimatedGas } = useSWRGas(
        active ? selectedSourceAccount?.address : undefined,
        source_network,
        swapBasicData?.source_token,
        gasEstimationAmount, sourceWallet, { enabled: active && !livePreset, transaction: gasTransaction },
    );

    const gasData = livePreset ? swapBasicData?.amountPresetGas : estimatedGas;

    // The form's Max can only price a plain transfer until a swap exists. Keep what
    // the real deposit transaction costs so Adjust amount and later retries never
    // budget less than it for this route and funding account.
    useEffect(() => {
        if (!active || !gasTransaction || !estimatedGas || !swapBasicData) return;
        recordDepositGasFloor({
            scope: amountPresetGasFloorScope(currentPresetSource, swapBasicData.destination_network.name, swapBasicData.destination_token.symbol),
            gas: estimatedGas,
        });
    }, [active, gasTransaction, estimatedGas, currentPresetSource, swapBasicData?.destination_network.name, swapBasicData?.destination_token.symbol, recordDepositGasFloor]);

    const lifecycleContext = useMemo(
        () => swapBasicData ? lifecycleContextFromSwap(swapBasicData, swapDetails) : undefined,
        [
            swapBasicData?.destination_address,
            swapBasicData?.destination_network?.name,
            swapBasicData?.destination_token?.symbol,
            swapBasicData?.requested_amount,
            swapBasicData?.source_network?.name,
            swapBasicData?.source_token?.symbol,
            swapBasicData?.use_deposit_address,
            swapDetails?.id,
            swapDetails?.source_address,
        ],
    )

    // The swap id and source address arrive after creation; they enrich the report but never repeat it.
    useLifecycleObservation(active && swapBasicData && !swapBasicData.use_deposit_address ? AWAITING_WALLET_ACTION : undefined, lifecycleContext)

    const quoteArgs = active ? transformSwapDataToQuoteArgs(swapBasicData, !!refuel) : undefined;
    // Limits feed useOutOfGas, which only matters for wallet withdrawals — skip them in deposit address flow
    const { minAllowedAmount, maxAllowedAmount } = useQuoteData(quoteArgs, {
        skipLimits: isDepositAddressSwap(swapBasicData),
    });
    const adjustedAmount = swapBasicData && walletBalanceAmount != null && selectedSourceAccount?.address
        && minAllowedAmount != null && Number.isFinite(minAllowedAmount)
        && maxAllowedAmount != null && Number.isFinite(maxAllowedAmount)
        ? resolveDepositFeeAdjustedAmount({
            requestedAmount: swapBasicData.requested_amount, walletBalance, gas: gasData,
            token: swapBasicData.source_token, nativeToken: source_network?.token,
            limitsMaxAmount: maxAllowedAmount, minAllowedAmount,
        })
        : undefined;
    // API swap networks are display metadata, not complete form routes. Restart
    // with configured routes so balance readers retain token lists and RPC data.
    const formSource = sourceRoutes?.find(route => route.name === swapBasicData?.source_network.name);
    const formDestination = destinationRoutes?.find(route => route.name === swapBasicData?.destination_network.name);
    const formSourceToken = formSource?.tokens.find(token => token.symbol === swapBasicData?.source_token.symbol);
    const formDestinationToken = formDestination?.tokens.find(token => token.symbol === swapBasicData?.destination_token.symbol);
    const showAdjustAmount = !!adjustFormAmount && adjustedAmount !== undefined && canAdjustAmount()
        && !!formSourceToken && !!formDestinationToken;

    const handleEditAmount = useCallback(() => {
        // Execution can start between rendering the action and clicking it.
        if (!adjustFormAmount || !canAdjustAmount() || adjustedAmount === undefined || !swapBasicData
            || !formSource || !formDestination || !formSourceToken || !formDestinationToken) {
            return;
        }
        widgetTelemetry.recordAmountInput('max');
        const maxFields = { amountMode: 'max' as const,
            amountPresetSource: amountPresetSource(swapBasicData.source_network.name, swapBasicData.source_token.symbol, selectedSourceAccount?.id, selectedSourceAccount?.address),
            amountPresetPending: true, amountPresetError: undefined };
        const updates: SwapFormValues = {
            ...maxFields,
            amount: adjustedAmount,
            from: formSource,
            to: formDestination,
            fromAsset: formSourceToken,
            toAsset: formDestinationToken,
            destination_address: swapBasicData.destination_address,
            refuel: !!refuel,
            depositMethod: swapBasicData.use_deposit_address
                ? 'deposit_address'
                : 'wallet',
        };
        startFreshSwapAttempt();
        adjustFormAmount(updates);
    }, [
        adjustedAmount,
        swapBasicData,
        refuel,
        adjustFormAmount, canAdjustAmount, selectedSourceAccount,
        startFreshSwapAttempt, formSource, formDestination, formSourceToken, formDestinationToken,
    ]);

    let warning: JSX.Element | null = null;
    let actionKey = 'transfer';
    let blocked = false;

    // A balance notification reaches this view before the controller's effect
    // publishes the new pending state. Compare the calculation's balance too,
    // so that first commit cannot flash a warning against the previous amount.
    // Settled failures and frozen/manual amounts still show genuine warnings.
    const presetIsSyncing = !swapId && !amountPresetLocked && isAmountPreset(swapBasicData?.amountMode)
        && (swapBasicData?.amountPresetPending || !Object.is(swapBasicData?.amountPresetBalance, walletBalanceAmount));
    // A submitted swap only needs a read-only status check. Its original balance
    // may already be spent, so funding warnings must not replace recovery controls.
    // The proposal already explains the funding change and owns its acceptance.
    // A generic balance block would hide that action while its amount is frozen.
    const showInsufficientBalanceWarning = !presetRevisionProposal && !hasSubmittedTransfer && !presetIsSyncing &&
        swapBasicData?.use_deposit_address === false &&
        swapBasicData?.requested_amount &&
        Number(swapBasicData?.requested_amount) &&
        Number(walletBalanceAmount) < Number(swapBasicData?.requested_amount);

    const { outOfGas, nativeGasShortage } = useOutOfGas({
        address: active ? selectedSourceAccount?.address : undefined,
        network: source_network,
        token: swapBasicData?.source_token,
        amount: gasEstimationAmount,
        balances,
        minAllowedAmount,
        maxAllowedAmount,
        transaction: gasTransaction,
        gasEstimate: { gasData },
    });
    // A preset recalculation clears its gas snapshot; keep the last shortage until it settles.
    const lastGasShortage = useRef(nativeGasShortage);
    if (nativeGasShortage || !presetIsSyncing) lastGasShortage.current = nativeGasShortage;
    const shownGasShortage = lastGasShortage.current;

    if (
        swapBasicData?.use_deposit_address === false &&
        showInsufficientBalanceWarning
    ) {
        const balanceAmount =
            walletBalanceAmount !== undefined
                ? truncateDecimals(
                      walletBalanceAmount,
                      swapBasicData?.source_token?.precision,
                  )
                : undefined;
        const showSpinner = isLoading;
        actionKey = 'insufficient';
        blocked = true;
        warning = (
            <TransferBlock reasonCode="insufficient_balance" path="Withdraw" context={{
                ...lifecycleContext,
                sourceWalletAddress: selectedSourceAccount?.address,
                walletBalance: walletBalance?.amount,
                walletBalanceNetwork: walletBalance?.network,
                walletBalanceToken: walletBalance?.token,
                walletBalanceTimestamp: walletBalance?.request_time,
            }}>
                <BalanceWarningView
                    amount={balanceAmount}
                    requiredAmount={swapBasicData.requested_amount}
                    network={swapBasicData.source_network.display_name}
                    asset={swapBasicData?.source_token?.asset}
                    refreshing={showSpinner}
                    refreshButton={
                        <>
                            <RefreshBalanceButton onRefresh={mutate} isLoading={isLoading} />
                            {showAdjustAmount && <AdjustAmountButton onEditAmount={handleEditAmount} isLoading={quoteIsLoading} />}
                        </>
                    }
                />
            </TransferBlock>
        );
    } else if (!presetRevisionProposal && !hasSubmittedTransfer && !isGaslessExecution && swapBasicData?.use_deposit_address === false && shownGasShortage) {
        // Keep execution mounted: a refreshed estimate or balance must not
        // interrupt an in-flight wallet request. Sending rechecks pending funds.
        const { requiredFee, availableBalance, symbol } = shownGasShortage;
        const precision = source_network?.token?.precision ?? 6;
        warning = <GasWarningView
            message={`Required maximum gas fee: ${formatTokenAmount(ceilToDecimals(requiredFee, precision), precision)} ${symbol}. Available native balance: ${truncateDecimals(availableBalance, precision)} ${symbol}. Add ${symbol} to your source account; reducing the token amount will not fund gas.`}
            adjustButton={<RefreshBalanceButton onRefresh={mutate} isLoading={isLoading} />}
        />;
    } else if (!presetRevisionProposal && !hasSubmittedTransfer && swapBasicData?.use_deposit_address === false && outOfGas && !presetIsSyncing) {
        // A changing gas warning must preserve the active wallet execution.
        actionKey = 'transfer';
        warning = <GasWarningView adjustButton={showAdjustAmount && <AdjustAmountButton compact onEditAmount={handleEditAmount} isLoading={quoteIsLoading} />} />;
    }
    return { warning, actionKey, blocked };
}

const Withdraw: FC<{
    type: 'widget' | 'contained';
    onWalletWithdrawalSuccess?: () => void;
    onCancelWithdrawal?: () => void;
    onAdjustAmount?: (updates: SwapFormValues) => void;
}> = ({ type, onWalletWithdrawalSuccess, onCancelWithdrawal, onAdjustAmount }) => {
    const { swapBasicData, swapDetails, refuel } = useSwapDataState();
    const { warning, actionKey, blocked } = useWithdrawBalance(true, onAdjustAmount);
    if (!swapBasicData) return null;
    return <Widget.Footer sticky={type === 'widget'}>
        <WalletActionTransition actionKey={actionKey}>
            {blocked ? warning : <WalletTransferButton swapBasicData={swapBasicData} swapId={swapDetails?.id} refuel={!!refuel} warning={warning} showProgress={false} onWalletWithdrawalSuccess={onWalletWithdrawalSuccess} onCancelWithdrawal={onCancelWithdrawal} />}
        </WalletActionTransition>
    </Widget.Footer>;
};
export default Withdraw;
