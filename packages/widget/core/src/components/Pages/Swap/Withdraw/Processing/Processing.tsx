'use client';
import CountdownTimer from '@/components/Common/CountDownTimer';
import { useCallbacks } from '@/context/callbackProvider';
import { useDepositSettings } from '@/context/depositSettings';
import { useResolvedSwapStatus } from '@/hooks/useResolvedSwapStatus';
import { getExplorerUrl } from '@/lib/address/explorerUrl';
import {
    BackendTransactionStatus,
    SwapBasicData,
    SwapDetails,
    SwapQuote,
    TransactionStatus,
    TransactionType,
} from '@/lib/apiClients/layerSwapApiClient';
import { ErrorHandler } from '@/lib/ErrorHandler';
import {
    useGaslessAuthorizationStore,
    useSwapTransactionStore,
} from '@/stores/swapTransactionStore';
import { type Refuel } from '@layerswap/widget-types';
import { FC, useCallback, useEffect, useMemo, useRef } from 'react';
import { useIntercom } from 'react-use-intercom';
import Failed from '../Failed';
import { ProcessingView } from '../Presentation/ProcessingView';
import { useSwapDataState } from '@/context/swap';
import { lifecycleContextFromSwap, PHASE_LIFECYCLE_EVENTS } from '@/lib/swapLifecycle';
import { useLifecycleObservation } from '@/hooks/useLifecycleObservation';
import { useClientLayoutEffect } from '@/hooks/useClientLayoutEffect';

type Props = {
    swapBasicData: SwapBasicData;
    swapDetails: SwapDetails;
    quote: SwapQuote | undefined;
    refuel: Refuel | undefined;
    inputFailureMessage?: string;
};

const Processing: FC<Props> = ({
    swapBasicData,
    swapDetails,
    quote,
    refuel,
    inputFailureMessage,
}) => {
    const { boot, show, update } = useIntercom();
    const { onSwapLifecycle } = useCallbacks();
    const { depositActionsResponse } = useSwapDataState();
    const { isDepositFlow } = useDepositSettings();
    const setSwapTransaction = useSwapTransactionStore(
        (state) => state.setSwapTransaction,
    );
    const storedWalletTransaction = useSwapTransactionStore((state) =>
        swapDetails?.id ? state.swapTransactions[swapDetails.id] : undefined,
    );
    // Gasless deposit broadcast tx (from the /authorize poll) — surfaces the hash + confirmations
    // before the swap's own input transaction appears.
    const gaslessAuthTx = useGaslessAuthorizationStore((state) =>
        swapDetails?.id
            ? state.authorizations[swapDetails.id]?.transaction
            : undefined,
    );

    const { source_network, source_token, destination_network, destination_token } = swapBasicData;

    const startIntercom = useCallback(() => {
        boot();
        show();
        update({ customAttributes: { swapId: swapDetails.id } });
    }, [boot, show, update, swapDetails.id]);

    const swapInputTransaction = swapDetails?.transactions?.find(
        (t) => t.type === TransactionType.Input,
    );

    const transactionHash =
        swapInputTransaction?.transaction_hash ||
        gaslessAuthTx?.transaction_hash ||
        storedWalletTransaction?.hash;
    const inputConfirmations =
        swapInputTransaction?.confirmations ?? gaslessAuthTx?.confirmations;
    const inputMaxConfirmations =
        swapInputTransaction?.max_confirmations ??
        gaslessAuthTx?.max_confirmations;

    const swapOutputTransaction = swapDetails.transactions?.find(t => t.type === TransactionType.Output);
    const lifecycleContext = useMemo(
        () => lifecycleContextFromSwap(swapBasicData, swapDetails),
        [
            destination_network.name,
            destination_token.symbol,
            source_network.name,
            source_token.symbol,
            swapBasicData.destination_address,
            swapBasicData.requested_amount,
            swapBasicData.use_deposit_address,
            swapDetails.id,
            swapDetails.source_address,
        ],
    )

    const resolved = useResolvedSwapStatus();
    const { phase, swapInputTxStatus, inputReady, failureReason } = resolved;

    const loggedNotDetectedTxAt = useRef<number | null>(null);

    useEffect(() => {
        if (
            swapInputTxStatus === TransactionStatus.Completed ||
            swapInputTxStatus === TransactionStatus.Pending
        ) {
            if (
                !swapDetails ||
                swapDetails.transactions?.find(
                    (t) => t.type === TransactionType.Input,
                )
            ) {
                return;
            }
            const fallback = storedWalletTransaction?.timestamp ?? Date.now();
            if (
                transactionHash &&
                Date.now() - (loggedNotDetectedTxAt.current ?? fallback) > 60000
            ) {
                loggedNotDetectedTxAt.current = Date.now();
                const error = new Error(
                    `Transaction not detected in ${source_network.name}. Tx hash: \`${transactionHash}\`. Tx status: ${swapInputTxStatus}. Swap id: \`${swapDetails.id}\`. ${source_network.display_name} explorer: ${getExplorerUrl(source_network?.transaction_explorer_template, transactionHash)} . LS explorer: https://layerswap.io/explorer/${storedWalletTransaction?.hash} `,
                );
                ErrorHandler({
                    type: 'TransactionNotDetected',
                    message: error.message,
                    name: error.name,
                    stack: error.stack,
                    cause: error.cause,
                    swapId: swapDetails.id,
                    transactionHash,
                    network: source_network.name,
                });
            }
        }
    }, [
        swapDetails,
        storedWalletTransaction,
        source_network,
        swapInputTxStatus,
        transactionHash,
    ]);

    useEffect(() => {
        if (!swapDetails?.id) return;
        if (!storedWalletTransaction?.hash) return;
        if (storedWalletTransaction.status !== swapInputTxStatus) {
            setSwapTransaction(
                swapDetails.id,
                swapInputTxStatus,
                storedWalletTransaction.hash,
            );
        }
    }, [
        swapInputTxStatus,
        storedWalletTransaction,
        swapDetails?.id,
        setSwapTransaction,
    ]);

    useEffect(() => {
        if (swapInputTxStatus === TransactionStatus.Failed && transactionHash) {
            const err = new Error('Transaction failed');
            const error = new Error(
                `Swap:${swapDetails?.id} transaction:${transactionHash} failed`,
            );
            error.name = `TransactionFailed`;
            error.cause = err;
            ErrorHandler({
                type: 'TransactionFailed',
                message: error.message,
                name: error.name,
                stack: error.stack,
                cause: error.cause,
                swapId: swapDetails?.id,
                transactionHash: transactionHash,
                fromAddress: swapInputTransaction?.from,
                toAddress: swapBasicData?.destination_address,
            });
        }
    }, [
        swapInputTxStatus,
        transactionHash,
        swapDetails?.id,
        swapInputTransaction?.from,
        swapBasicData?.destination_address,
    ]);

    // Once per hash by design: status changes are reported by input_transfer_confirmed, and the
    // context is read from a ref so later enrichment cannot re-run it. Allowlisted in tests/lifecycle-effect-emitters.test.mjs.
    const lifecycleContextRef = useRef(lifecycleContext)
    useClientLayoutEffect(() => { lifecycleContextRef.current = lifecycleContext })
    useEffect(() => {
        if (!swapInputTransaction?.transaction_hash) return
        onSwapLifecycle({
            step: 'input_transaction_detected',
            stage: 'input_transfer',
            outcome: 'pending',
            path: 'Processing',
            transactionHash: swapInputTransaction.transaction_hash,
            inputTransactionHash: swapInputTransaction.transaction_hash,
            status: swapInputTransaction.status,
            confirmations: swapInputTransaction.confirmations,
            maxConfirmations: swapInputTransaction.max_confirmations,
            ...lifecycleContextRef.current,
        })
    }, [
        onSwapLifecycle,
        swapInputTransaction?.transaction_hash,
    ])

    // Transaction and phase observations are keyed on their observation fingerprint
    // (hash, status, outcome, phase, reason): a later source address or confirmation
    // count enriches the report without repeating it.
    useLifecycleObservation(inputReady && swapInputTransaction ? {
        step: 'input_transfer_confirmed',
        stage: 'input_transfer',
        outcome: 'succeeded',
        path: 'Processing',
        transactionHash: swapInputTransaction.transaction_hash,
        inputTransactionHash: swapInputTransaction.transaction_hash,
        status: swapInputTransaction.status,
        confirmations: swapInputTransaction.confirmations,
        maxConfirmations: swapInputTransaction.max_confirmations,
    } : undefined, lifecycleContext)

    useLifecycleObservation(swapOutputTransaction?.transaction_hash ? {
        step: 'output_transaction_detected',
        stage: 'output_transfer',
        outcome: swapOutputTransaction.status === BackendTransactionStatus.Completed
            ? 'succeeded'
            : swapOutputTransaction.status === BackendTransactionStatus.Failed ? 'failed' : 'pending',
        path: 'Processing',
        transactionHash: swapOutputTransaction.transaction_hash,
        outputTransactionHash: swapOutputTransaction.transaction_hash,
        status: swapOutputTransaction.status,
        confirmations: swapOutputTransaction.confirmations,
        maxConfirmations: swapOutputTransaction.max_confirmations,
    } : undefined, lifecycleContext)

    useLifecycleObservation({
        ...PHASE_LIFECYCLE_EVENTS[phase],
        path: 'Processing',
        status: swapDetails.status,
        phase,
        reasonCode: swapDetails.fail_reason || failureReason,
    }, lifecycleContext)

    return (
        <ProcessingView
            swapBasicData={swapBasicData}
            swapDetails={swapDetails}
            depositActions={depositActionsResponse}
            quote={quote}
            refuel={refuel}
            resolved={resolved}
            transactionHash={transactionHash}
            inputConfirmations={inputConfirmations}
            inputMaxConfirmations={inputMaxConfirmations}
            inputFailureMessage={inputFailureMessage}
            isDepositFlow={isDepositFlow}
            failedPanel={<Failed />}
            onGetHelp={startIntercom}
            elapsedTime={
                quote?.avg_completion_time ? (
                    <CountdownTimer
                        initialTime={quote.avg_completion_time}
                        swapDetails={swapDetails}
                    />
                ) : null
            }
        />
    );
};
export default Processing;
