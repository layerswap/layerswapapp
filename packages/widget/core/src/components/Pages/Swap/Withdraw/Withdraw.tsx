import { widgetTelemetry } from '@/lib/widgetTelemetry';
import { truncateDecimals } from '@/components/utils/RoundDecimals';
import { Widget } from '@/components/Widget/Index';
import { useSettingsState } from '@/context/settings';
import { useSwapDataState, useSwapDataUpdate } from '@/context/swap';
import { useSelectedAccount } from '@/context/swapAccounts';
import { isDepositAddressSwap } from '@/helpers/swapFlow';
import { transformSwapDataToQuoteArgs, useQuoteData } from '@/hooks/useFee';
import { useBalance } from '@/lib/balances/useBalance';
import useOutOfGas from '@/lib/gases/useOutOfGas';
import useSWRGas from '@/lib/gases/useSWRGas';
import { resolveMaxAllowedAmount } from '@/components/Input/Amount/helpers';
import { amountPresetSource, isAmountPreset } from '@/lib/amountPresets';
import { truncateToDecimals } from '@/components/utils/RoundDecimals';
import { NetworkRoute, NetworkType } from '@layerswap/widget-types';
import type { JSX } from 'react';
import { FC, useCallback, useMemo } from 'react';
import { AdjustAmountButton } from '../Form/SecondaryComponents/validationError/AdjustAmountButton';
import { RefreshBalanceButton } from '../Form/SecondaryComponents/validationError/RefreshBalanceButton';
import type { AdjustWithdrawalAmount, SwapFormValues } from '../Form/SwapFormValues';
import {
    BalanceWarningView,
    GasWarningView,
} from './Presentation/BalanceWarningView';
import WalletTransferButton from './WalletTransferButton';
import { WalletActionTransition } from './Presentation/WalletActionTransition';
import { lifecycleContextFromSwap } from '@/lib/swapLifecycle';
import { useTransferBlocked } from '@/hooks/useTransferBlocked';
import { type ObservedLifecycleEvent, useLifecycleObservation } from '@/hooks/useLifecycleObservation';
import { useSwapTransactionStore } from '@/stores/swapTransactionStore';
import { getActionableDepositAction, isTransferAction } from '@/helpers/depositActions';

// "Transfer screen shown": reported once while the screen is visible, before any swap exists.
const AWAITING_WALLET_ACTION: ObservedLifecycleEvent = {
    step: 'awaiting_wallet_action',
    stage: 'wallet_action',
    outcome: 'pending',
    path: 'Withdraw',
    action: 'send_from_wallet',
}

export function useWithdrawBalance(active = true, adjustFormAmount?: AdjustWithdrawalAmount) {
    const { swapBasicData, swapDetails, swapId, amountPresetLocked, depositActionsResponse, refuel, quoteIsLoading } =
        useSwapDataState();
    const { setSubmitedFormValues, startFreshSwapAttempt, canAdjustAmount } = useSwapDataUpdate();
    const checkingSubmission = useSwapTransactionStore(state => {
        if (!swapId) {
            return false;
        }
        const transaction = state.swapTransactions[swapId];
        return !!state.pendingSubmissions[swapId]
            || (transaction?.kind === 'atomic-batch'
                && !!transaction.providerSubmissionAccepted
                && !transaction.hash);
    });

    const { networks } = useSettingsState();
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
    );
    const walletBalance =
        source_network &&
        balances?.find(
            (b) =>
                b?.network === source_network?.name &&
                b?.token === swapBasicData?.source_token?.symbol,
        );
    const walletBalanceAmount = walletBalance?.amount;
    const action = getActionableDepositAction(depositActionsResponse);
    const transferAction = action && isTransferAction(action)
        && source_network?.type === NetworkType.EVM
        && (!action.network || action.network.name === source_network?.name)
        && (!action.token || action.token.symbol === swapBasicData?.source_token.symbol)
        && (!action.from_address || action.from_address.toLowerCase() === selectedSourceAccount?.address?.toLowerCase())
        ? action : undefined;
    const gasTransaction = transferAction?.to_address && transferAction.amount != null ? {
        recipientAddress: transferAction.to_address,
        callData: transferAction.call_data ?? '',
        amountInBaseUnits: transferAction.amount_in_base_units,
    } : undefined;
    const gasEstimationAmount = gasTransaction ? transferAction?.amount : swapBasicData?.requested_amount;
    const { gasData } = useSWRGas(
        active ? selectedSourceAccount?.address : undefined,
        source_network,
        swapBasicData?.source_token,
        gasEstimationAmount, undefined, { enabled: active, transaction: gasTransaction },
    );

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
    const adjustedAmount = (() => {
        if (!swapBasicData || walletBalanceAmount == null || !selectedSourceAccount?.address
            || minAllowedAmount == null || !Number.isFinite(minAllowedAmount)
            || maxAllowedAmount == null || !Number.isFinite(maxAllowedAmount)) return undefined;
        const maxAmount = resolveMaxAllowedAmount({
            walletBalance, gasAmount: gasData?.maxFee ?? gasData?.gas, gasReserve: gasData?.reserve,
            fromCurrency: swapBasicData.source_token, native_currency: gasData?.token ?? source_network?.token,
            limitsMaxAmount: maxAllowedAmount, depositMethod: 'wallet',
        });
        if (maxAmount == null || !Number.isFinite(maxAmount)) return undefined;
        const newAmount = truncateToDecimals(String(maxAmount), swapBasicData.source_token.decimals);
        const amount = Number(newAmount);
        // Only offer a reduction that can satisfy the route after token rounding.
        return amount > 0 && amount >= minAllowedAmount && amount < Number(swapBasicData.requested_amount)
            ? newAmount : undefined;
    })();
    const showAdjustAmount = !!adjustFormAmount && adjustedAmount !== undefined && canAdjustAmount();

    const handleEditAmount = useCallback(() => {
        // Execution can start between rendering the action and clicking it.
        if (!adjustFormAmount || !canAdjustAmount() || adjustedAmount === undefined || !swapBasicData) {
            return;
        }
        widgetTelemetry.recordAmountInput('max');
        const maxFields = { amountMode: 'max' as const,
            amountPresetSource: amountPresetSource(swapBasicData.source_network.name, swapBasicData.source_token.symbol, selectedSourceAccount?.id, selectedSourceAccount?.address),
            amountPresetPending: true, amountPresetError: undefined };
        const updates: SwapFormValues = {
            ...maxFields,
            amount: adjustedAmount,
            from: swapBasicData.source_network as NetworkRoute,
            to: swapBasicData.destination_network as NetworkRoute,
            fromAsset: swapBasicData.source_token,
            toAsset: swapBasicData.destination_token,
            destination_address: swapBasicData.destination_address,
            refuel: !!refuel,
            depositMethod: swapBasicData.use_deposit_address
                ? 'deposit_address'
                : 'wallet',
        };
        startFreshSwapAttempt();
        const nextValues = adjustFormAmount(updates);
        setSubmitedFormValues(nextValues);
    }, [
        adjustedAmount,
        swapBasicData,
        refuel,
        adjustFormAmount, canAdjustAmount, selectedSourceAccount,
        setSubmitedFormValues,
        startFreshSwapAttempt,
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
    const showInsufficientBalanceWarning = !checkingSubmission && !presetIsSyncing &&
        swapBasicData?.use_deposit_address === false &&
        swapBasicData?.requested_amount &&
        Number(swapBasicData?.requested_amount) &&
        Number(walletBalanceAmount) < Number(swapBasicData?.requested_amount);

    const { outOfGas } = useOutOfGas({
        address: active ? selectedSourceAccount?.address : undefined,
        network: source_network,
        token: swapBasicData?.source_token,
        amount: gasEstimationAmount,
        balances,
        minAllowedAmount,
        maxAllowedAmount,
        transaction: gasTransaction,
    });

    // The gas warning keeps WalletTransferButton available, so it is not a block.
    useTransferBlocked(
        active && swapBasicData?.use_deposit_address === false && showInsufficientBalanceWarning ? 'insufficient_balance'
        : undefined,
        { ...lifecycleContext,
            sourceWalletAddress: selectedSourceAccount?.address, walletBalance: walletBalance?.amount,
            walletBalanceNetwork: walletBalance?.network, walletBalanceToken: walletBalance?.token,
            walletBalanceTimestamp: walletBalance?.request_time }, 'Withdraw')

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
                <BalanceWarningView
                    amount={balanceAmount}
                    asset={swapBasicData?.source_token?.asset}
                    refreshing={showSpinner}
                    refreshButton={
                        <>
                            <RefreshBalanceButton onRefresh={mutate} isLoading={isLoading} />
                            {showAdjustAmount && <AdjustAmountButton onEditAmount={handleEditAmount} isLoading={quoteIsLoading} />}
                        </>
                    }
                />
        );
    } else if (!checkingSubmission && swapBasicData?.use_deposit_address === false && outOfGas && !presetIsSyncing) {
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
    onAdjustAmount?: AdjustWithdrawalAmount;
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
