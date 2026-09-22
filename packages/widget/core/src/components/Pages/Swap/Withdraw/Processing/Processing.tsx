'use client';
import { useIsGaslessActive } from '@/hooks/useIsGaslessActive';
import { shouldShowCompactSwapQuote } from '@/helpers/swapFlow';
import { SwapPhase } from '@/components/utils/resolveSwapPhase';
import { SwapQuoteDetails } from '../SwapQuoteDetails';
import CountdownTimer from '@/components/Common/CountDownTimer';
import { useCallbacks } from '@/context/callbackProvider';
import { useDepositSettings } from '@/context/depositSettings';
import { useResolvedSwapStatus } from '@/hooks/useResolvedSwapStatus';
import { SwapFailureReason } from '@/hooks/useSwapRetry';
import { getExplorerUrl } from '@/lib/address/explorerUrl';
import LayerSwapApiClient, {
    BackendTransactionStatus,
    SwapBasicData,
    SwapDetails,
    SwapQuote,
    TransactionStatus,
    TransactionType,
} from '@/lib/apiClients/layerSwapApiClient';
import { ErrorHandler } from '@/lib/ErrorHandler';
import { ApiResponse } from '@/Models/ApiResponse';
import {
    useGaslessAuthorizationStore,
    useSwapTransactionStore,
} from '@/stores/swapTransactionStore';
import { SwapStatus, type Refuel } from '@layerswap/widget-types';
import { FC, useCallback, useEffect, useRef } from 'react';
import { useIntercom } from 'react-use-intercom';
import useSWR from 'swr';
import Failed from '../Failed';
import { ProcessingView } from '../Presentation/ProcessingView';
import SwapSummary from '../Summary';

const apiClient = new LayerSwapApiClient();

type Props = {
    swapBasicData: SwapBasicData;
    swapDetails: SwapDetails;
    quote: SwapQuote | undefined;
    refuel: Refuel | undefined;
    failureReason?: SwapFailureReason;
};

const Processing: FC<Props> = ({
    swapBasicData,
    swapDetails,
    quote,
    refuel,
    failureReason,
}) => {
    const isGaslessActive = useIsGaslessActive(swapBasicData);
    const showCompactQuote = shouldShowCompactSwapQuote({
        swapData: swapBasicData,
        isGaslessActive,
    });
    const { boot, show, update } = useIntercom();
    const { onSwapStatusChange } = useCallbacks();
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

    const { source_network } = swapBasicData;

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

    const { data: inputTxStatusData } = useSWR<
        ApiResponse<{ status: TransactionStatus }>
    >(
        transactionHash &&
            swapInputTransaction?.status !== BackendTransactionStatus.Completed
            ? [source_network?.name, transactionHash]
            : null,
        ([network, tx_id]) =>
            apiClient.GetTransactionStatus(network, tx_id as any),
        { dedupingInterval: 6000 },
    );

    const inputTxStatusFromApi =
        inputTxStatusData?.data?.status?.toLowerCase() as
            | TransactionStatus
            | undefined;
    const resolved = useResolvedSwapStatus({
        inputTxStatusFromApi,
        gaslessAuthorizationFailed: failureReason === 'gasless_deposit_failed',
    });
    const { swapInputTxStatus } = resolved;

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

    useEffect(() => {
        const status = swapDetails?.status;
        if (
            status === SwapStatus.Completed ||
            status === SwapStatus.Failed ||
            status === SwapStatus.Expired ||
            status === SwapStatus.LsTransferPending
        ) {
            onSwapStatusChange({
                type: status,
                swapId: swapDetails?.id!,
                path: 'Processing',
            });
        }
    }, [swapDetails?.status, swapDetails?.id]);

    return (
        <ProcessingView
            swapBasicData={swapBasicData}
            swapDetails={swapDetails}
            refuel={refuel}
            resolved={resolved}
            transactionHash={transactionHash}
            inputConfirmations={inputConfirmations}
            inputMaxConfirmations={inputMaxConfirmations}
            isDepositFlow={isDepositFlow}
            summary={<SwapSummary />}
            quoteDetails={
                showCompactQuote && resolved.phase !== SwapPhase.Completed ? (
                    <SwapQuoteDetails
                        compact
                        swapBasicData={swapBasicData}
                        quote={quote}
                        refuel={refuel}
                        quoteIsLoading={false}
                        quoteError={undefined}
                    />
                ) : null
            }
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
