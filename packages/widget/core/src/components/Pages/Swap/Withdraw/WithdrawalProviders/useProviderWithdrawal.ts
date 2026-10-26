import { useCallback, useEffect, useRef, useState } from 'react';
import { ActionMessageType, type WalletWithdrawal, type TransferProgress } from '@layerswap/widget-types';
import { isUserRejection } from '@layerswap/wallet-core/errors';
import { AmountPresetChangedError } from '@/lib/amountPresets';
import type { DepositAction } from '@/lib/apiClients/layerSwapApiClient';
import { truncateToDecimals } from '@/components/utils/RoundDecimals';
import { isTransferAction } from '@/helpers/depositActions';
import { useSwapDataState, useSwapDataUpdate } from '@/context/swap';
import { useWalletWithdrawalState } from '@/context/withdrawalContext';
import { useSelectedAccount } from '@/context/swapAccounts';
import { useInitialSettings, useSettingsState } from '@/context/settings';
import { useCallbacks } from '@/context/callbackProvider';
import useWallet from '@/hooks/useWallet';
import { useTransfer } from '@/hooks/useTransfer';
import { useSwapTransactionStore } from '@/stores/swapTransactionStore';
import { lifecycleContextFromSwap } from '@/lib/swapLifecycle';
import { executeWalletOperation } from '../Wallet/Common/executeWalletOperation';
import type { WithdrawPageProps } from '../Wallet/Common/sharedTypes';
import { useWithdrawalExecution } from '../useWithdrawalExecution';
import { walletWithdrawalValues, withdrawalSelectionKey } from '../withdrawalHelpers';
import { reportWithdrawalError } from '../reportWithdrawalError';
import { executeProviderWithdrawal, getProviderDepositActions } from './executeProviderWithdrawal';

export type ProviderWithdrawalError = { header: string; details: string };
/** Providers supply amount normalization and deposit instructions. The controller
 * owns preparation, retries, cancellation, submission receipts and presentation state. */
export function useProviderWithdrawal({ swapBasicData, refuel, swapId }: WithdrawPageProps, definition: WalletWithdrawal, active = true) {
    const { source_network, source_token, destination_network, destination_token, destination_address } = swapBasicData;
    const { networks, sourceRoutes } = useSettingsState();
    const initialSettings = useInitialSettings();
    const { onWalletWithdrawalSuccess } = useWalletWithdrawalState();
    const { swapDetails } = useSwapDataState();
    const { createSwap, setSwapId, startFreshSwapAttempt, mutateSwap, acquireWalletExecution } = useSwapDataUpdate();
    const { executeTransfer } = useTransfer();
    const { onSwapLifecycle } = useCallbacks();
    const account = useSelectedAccount('from', source_network.name);
    const { wallets } = useWallet(source_network, 'withdrawal');
    const wallet = wallets.find(candidate => candidate.id === account?.id);
    const sourceAddress = account?.address;
    const selectionKey = withdrawalSelectionKey(source_network.name, account, wallet);
    const { begin, loading, inFlight } = useWithdrawalExecution(selectionKey, acquireWalletExecution);
    const [progress, setProgress] = useState<TransferProgress>();
    const [error, setError] = useState<ProviderWithdrawalError>();
    const [rejected, setRejected] = useState(false);
    const lastFailureWasUserRejection = useRef(false);

    // Preparation belongs to the selected wallet, even while its old request settles.
    useEffect(() => {
        setProgress(undefined);
    }, [selectionKey]);

    // Lazy creation can precede context updates. Scope its fallback ID to the
    // reviewed draft so adjusted inputs cannot reuse an old provider's calldata.
    const draftKey = JSON.stringify([
        definition.id, selectionKey, source_token.symbol, destination_network.name,
        destination_token.symbol, destination_address, String(swapBasicData.requested_amount), refuel,
    ]);
    const preparedSwap = useRef<{ id: string; key: string } | undefined>(undefined);
    const preparedSwapId = useCallback(() => preparedSwap.current?.key === draftKey ? preparedSwap.current.id : undefined, [draftKey]);
    const submissionAccepted = useSwapTransactionStore(state => {
        const id = swapId ?? preparedSwapId();
        const transaction = id ? state.swapTransactions[id] : undefined;
        return !!transaction?.providerSubmissionAccepted || !!transaction?.hash;
    });
    const wasActive = useRef(active);
    useEffect(() => {
        const becameActive = active && !wasActive.current;
        wasActive.current = active;
        if (!becameActive || inFlight.current) {
            return;
        }
        preparedSwap.current = undefined;
        setError(undefined);
        setRejected(false);
        setProgress(undefined);
    }, [active, inFlight]);

    const handleWithdraw = useCallback(async () => {
        const attempt = begin();
        if (!attempt) {
            return;
        }
        const { signal, isCurrent } = attempt;
        let executionSwapId = swapId ?? preparedSwapId();
        const lifecycle = {
            ...lifecycleContextFromSwap(swapBasicData, swapDetails),
            path: `${definition.displayName}Withdrawal`,
            action: `${definition.id}_withdrawal`,
            provider: wallet?.providerName,
        };
        try {
            if (rejected || error) {
                onSwapLifecycle({
                    ...lifecycle, swapId: executionSwapId,
                    step: 'retry_requested', stage: 'wallet_action', outcome: 'started',
                    reasonCode: lastFailureWasUserRejection.current ? 'user_rejected' : 'provider_withdrawal_failed',
                });
            }
            setError(undefined);
            setRejected(false);
            if (!sourceAddress || !wallet) {
                throw new Error(`No connected ${definition.displayName} account`);
            }
            if (swapBasicData.requested_amount == null) {
                throw new Error('Invalid amount');
            }
            const reviewedAmount = String(swapBasicData.requested_amount).trim();
            const decimals = definition.amountDecimals?.(source_token);
            const amount = decimals === undefined ? reviewedAmount : truncateToDecimals(reviewedAmount, decimals);
            const numericAmount = Number(amount);
            if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
                throw new Error('Invalid amount');
            }

            let depositActions: DepositAction[] | undefined;
            if (!executionSwapId) {
                startFreshSwapAttempt();
                const created = await createSwap(walletWithdrawalValues(swapBasicData, refuel, amount), initialSettings);
                signal.throwIfAborted();
                executionSwapId = created?.swap?.id;
                if (!executionSwapId) {
                    throw new Error('Swap ID is undefined');
                }
                depositActions = created.deposit_actions;
                preparedSwap.current = { id: executionSwapId, key: draftKey };
                setSwapId(executionSwapId);
            }
            const id = executionSwapId;
            signal.throwIfAborted();
            await executeProviderWithdrawal({
                signal, swapId: id, sourceAddress,
                onReconcile: response => mutateSwap(response, false),
                prepare: async () => {
                    signal.throwIfAborted();
                    const actions = depositActions?.length ? depositActions : await getProviderDepositActions(id, sourceAddress);
                    return definition.prepareTransfer(actions.find(isTransferAction), numericAmount);
                },
                execute: (transfer, onSubmissionStateChange) => {
                    signal.throwIfAborted();
                    return executeWalletOperation({
                        context: { ...lifecycle, swapId: id },
                        onLifecycle: onSwapLifecycle, allowEmptyHash: true, isActive: isCurrent,
                    }, () => executeTransfer({
                        swapId: id, onSubmissionStateChange,
                        network: source_network, token: source_token,
                        destinationNetwork: destination_network, destinationToken: destination_token,
                        networks, sourceRoutes, sourceAddress, selectedWallet: wallet,
                        ...transfer,
                    }, wallet, info => { if (isCurrent()) setProgress(info); }));
                },
            });
            if (isCurrent()) {
                onWalletWithdrawalSuccess?.();
            }
        } catch (cause) {
            if (!isCurrent()) {
                return;
            }
            if (cause instanceof AmountPresetChangedError) {
                setError({ header: 'Amount updated', details: cause.message });
                return;
            }
            lastFailureWasUserRejection.current = isUserRejection(cause);
            if (lastFailureWasUserRejection.current) {
                setRejected(true);
                return;
            }
            reportWithdrawalError(cause, { swapId: executionSwapId, fromAddress: sourceAddress });
            const failure = cause as Error & { header?: string };
            if (failure?.name === ActionMessageType.TransactionRejected) {
                setRejected(true);
            } else {
                setError({ header: failure?.header ?? 'Withdrawal failed', details: failure?.message || 'Unexpected error occurred.' });
            }
        } finally {
            attempt.finish();
            if (isCurrent()) {
                setProgress(undefined);
            }
        }
    }, [begin, swapId, preparedSwapId, swapBasicData, swapDetails, definition, wallet, sourceAddress,
        error, rejected, onSwapLifecycle, startFreshSwapAttempt, createSwap, refuel, initialSettings,
        draftKey, setSwapId, mutateSwap, executeTransfer, source_network, source_token, destination_network,
        destination_token, networks, sourceRoutes, onWalletWithdrawalSuccess]);

    return {
        handleWithdraw, loading: loading || submissionAccepted, progress, error, rejected,
        isConnected: !!wallet, wallet, activeAddress: wallet?.address, sourceAddress,
    };
}

export type ProviderWithdrawalState = ReturnType<typeof useProviderWithdrawal>;
