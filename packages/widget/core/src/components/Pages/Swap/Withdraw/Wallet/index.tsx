import { useClientLayoutEffect } from '@/hooks/useClientLayoutEffect';
import { useSwapDataUpdate } from '@/context/swap';
import { ProgressPanelView } from '../Presentation/ProgressPanelView';
import { getWalletProgress } from '../Presentation/walletProgress';
import { useWalletWithdrawalState } from '@/context/withdrawalContext';
import { ConnectWalletView, getSendTransactionPresentation } from '../Presentation/WalletActionsView';
import { FC, Suspense, useCallback, useEffect, useMemo, useState, useRef, type ReactNode } from "react";
import { SwapBasicData } from "@/lib/apiClients/layerSwapApiClient";
import { WithdrawalProvider } from "@/context/withdrawalContext";
import useWallet from "@/hooks/useWallet";
import { useSelectedAccount } from "@/context/swapAccounts";
import { useSwapDataState } from "@/context/swap";
import { WithdrawPageProps } from "./Common/sharedTypes";
import { useConnectWalletController, useSendTransactionController } from "./Common/buttons";
import { GaslessSigner } from "./Common/depositExecution";
import { useInitialSettings, useSettingsState } from "@/context/settings";
import { useBalance } from "@/lib/balances/useBalance";
import { TransferProps } from "@layerswap/widget-types";
import { useActionMessage } from "./Common/actionMessage";
import { ActionMessages } from "../messages/TransactionMessages";
import { useTransfer } from "@/hooks/useTransfer";
import { useGasless } from "@/hooks/useGasless";
import { useRpcHealth } from "@/context/rpcHealthContext";
import RPCUnhealthyMessage from "./RPCUnhealthyMessage";
import { useWithdrawalProvider } from '@/hooks/useWithdrawalProvider';
import { ProviderWalletWithdrawal } from '../WithdrawalProviders/ProviderWalletWithdrawal';
import { useCallbacks } from "@/context/callbackProvider";
import { lifecycleContextFromSwap, lifecycleErrorDetails } from "@/lib/swapLifecycle";
import { TransferBlock } from '../TransferBlock';
import { useHasSubmittedWalletTransaction } from '@/hooks/useHasSubmittedTransfer';
import { isProviderHydrated } from "@layerswap/wallet-core";
import { isUserRejection } from "./Common/isUserRejection";
import { useSwapTransactionStore } from '@/stores/swapTransactionStore';
import { useWithdrawalScope } from '../useWithdrawalExecution';
import { withdrawalSelectionKey } from '../withdrawalHelpers';
import { UnsupportedSourceWallet } from './UnsupportedSourceWallet';

type Props = {
    swapData: SwapBasicData
    swapId: string | undefined
    refuel: boolean
    onWalletWithdrawalSuccess?: () => void
    onCancelWithdrawal?: () => void
    showProgress?: boolean
};
export const WalletTransferAction: FC<Props> = ({ swapData, swapId, refuel, onWalletWithdrawalSuccess, onCancelWithdrawal, showProgress }) => {
    const { source_network } = swapData

    const { provider, wallets } = useWallet(source_network, "withdrawal")
    const selectedSourceAccount = useSelectedAccount("from", source_network?.name);

    useEffect(() => {
        const selectedWallet = wallets.find(w => w.id === selectedSourceAccount?.id && w.addresses.some(a => a.toLowerCase() === selectedSourceAccount.address.toLowerCase()))
        if (selectedSourceAccount && selectedWallet && provider?.switchAccount) {
            provider?.switchAccount(selectedWallet, selectedSourceAccount.address)
        }
    }, [selectedSourceAccount?.address, source_network?.name])

    return <>
        {
            swapData &&
            <WithdrawalProvider onWalletWithdrawalSuccess={onWalletWithdrawalSuccess} onCancelWithdrawal={onCancelWithdrawal} showProgress={showProgress}>
                <WalletWithdrawal
                    swapId={swapId}
                    swapBasicData={swapData}
                    refuel={refuel}
                />
            </WithdrawalProvider>
        }
    </>;
};

export function useWalletWithdrawalController({
    swapBasicData,
    refuel,
    swapId
}: WithdrawPageProps, active = true) {

    const { source_network, destination_network, destination_address } = swapBasicData
    const selectedSourceAccount = useSelectedAccount("from", swapBasicData.source_network.name);
    const { wallets, provider } = useWallet(source_network, "withdrawal")
    const { sameAccountNetwork } = useInitialSettings()
    const { swapDetails } = useSwapDataState()
    const { onSwapLifecycle } = useCallbacks()
    const wallet = wallets.find(w => w.id === selectedSourceAccount?.id && w.withdrawalSupportedNetworks?.includes(source_network?.name))
    const networkChainId = source_network?.chain_id ?? undefined
    const savedTransactionHash = useSwapTransactionStore(state => swapId ? state.swapTransactions[swapId]?.hash : undefined)
    const lifecycleContext = useMemo(
        () => lifecycleContextFromSwap(swapBasicData, swapDetails),
        [
            swapBasicData.destination_address,
            swapBasicData.destination_network.name,
            swapBasicData.destination_token.symbol,
            swapBasicData.requested_amount,
            swapBasicData.source_network.name,
            swapBasicData.source_token.symbol,
            swapBasicData.use_deposit_address,
            swapDetails?.id,
            swapDetails?.source_address,
        ],
    )
    const sameAccountMismatch = (
        source_network?.name.toLowerCase() === sameAccountNetwork?.toLowerCase()
        || destination_network?.name.toLowerCase() === sameAccountNetwork?.toLowerCase()
    ) && !!(
        selectedSourceAccount?.address
        && destination_address
        && selectedSourceAccount.address.toLowerCase() !== destination_address.toLowerCase()
    )

    const hasMultiStepHandler = !!provider?.multiStepHandlers?.some(handler => handler.supportedNetworks.includes(source_network?.name))
    // The account can restore before its provider publishes the connected wallet.
    // useWallet's network provider may belong to another account, so check the
    // selected account's own snapshot before treating a missing wallet as unsupported.
    const selectedProvider = selectedSourceAccount?.provider
    const selectedProviderReady = isProviderHydrated(selectedProvider)
        && selectedProvider.pendingSessionRestore !== true
    const connection = useConnectWalletController();
    const transfer = useTransferTokenController({ swapData: swapBasicData, refuel, chainId: Number(networkChainId), savedTransactionHash }, active && !!wallet && !sameAccountMismatch && !hasMultiStepHandler);
    const send = useSendTransactionController(transfer.sendProps, active && !!wallet && !sameAccountMismatch && !hasMultiStepHandler);
    const presentation = getSendTransactionPresentation(send);
    let controls: ReactNode = presentation.controls;
    const hasSubmittedTransfer = useHasSubmittedWalletTransaction();
    const observingSubmission = send.pendingSubmission || send.submissionAccepted || hasSubmittedTransfer;
    if (!observingSubmission && transfer.rpcMessage) controls = transfer.rpcMessage;
    if (!observingSubmission && !wallet) {
        const connect = <ConnectWalletView {...connection} />;
        controls = selectedSourceAccount && selectedProviderReady ? (
            <TransferBlock reasonCode="wallet_unsupported_for_network" path="WalletWithdrawal"
                reason={`${selectedSourceAccount.displayName || selectedSourceAccount.providerName || 'The selected wallet'} cannot send from ${source_network.name}`}>
                <UnsupportedSourceWallet
                    swapData={swapBasicData}
                    walletName={selectedSourceAccount.displayName || selectedSourceAccount.providerName || 'The selected wallet'}
                />
            </TransferBlock>
        ) : connect;
    }
    if (!observingSubmission && sameAccountMismatch) {
        const network = source_network.name.toLowerCase() === sameAccountNetwork?.toLowerCase() ? source_network : destination_network;
        controls = <TransferBlock reasonCode="same_account_required" path="WalletWithdrawal"
            reason="The selected source and destination accounts must match for this route">
            <ActionMessages.DifferentAccountsNotAllowedError network={network.display_name} />
        </TransferBlock>;
    }
    // Custom multi-step handlers retain their existing completion/error contract.
    if (!observingSubmission && provider?.multiStepHandlers) {
        const MultiStepHandler = provider.multiStepHandlers.find(handler => handler.supportedNetworks.includes(source_network?.name))?.component

        if (MultiStepHandler) {
            controls = <Suspense fallback={null}>
                <MultiStepHandler
                    swapId={swapId}
                    swapBasicData={swapBasicData}
                    refuel={refuel}
                    onTransferComplete={(hash: string) => {
                        if (swapId) useSwapTransactionStore.getState().setSwapTransaction(swapId, hash, 'wallet-transfer')
                        onSwapLifecycle({
                            step: 'transaction_submitted',
                            stage: 'input_transfer',
                            outcome: 'succeeded',
                            path: 'MultiStepWalletTransfer',
                            action: 'send_transaction',
                            provider: wallet?.providerName || provider?.name,
                            transactionHash: hash,
                            ...lifecycleContext,
                        })
                    }}
                    onTransferError={(error: unknown) => {
                        // Optional: handlers that report failures make them visible like the shared path.
                        const rejected = isUserRejection(error)
                        const errorDetails = lifecycleErrorDetails(error)
                        onSwapLifecycle({
                            step: rejected ? 'wallet_action_rejected' : 'wallet_action_failed',
                            stage: 'wallet_action',
                            outcome: rejected ? 'rejected' : 'failed',
                            path: 'MultiStepWalletTransfer',
                            action: 'send_transaction',
                            provider: wallet?.providerName || provider?.name,
                            ...errorDetails,
                            reasonCode: rejected ? 'user_rejected' : errorDetails.reasonCode,
                            ...lifecycleContext,
                        })
                    }}
                />
            </Suspense>
        }
    }

    return { controls: active ? controls : null, actionKey: !wallet ? 'connect' : transfer.rpcMessage ? 'rpc' : 'transfer', walletProgress: presentation.walletProgress, feedback: send.walletActionFeedback };
}

export const WalletWithdrawal: FC<WithdrawPageProps> = props => {
    const definition = useWithdrawalProvider(props.swapBasicData.source_network);
    if (definition) return <ProviderWalletWithdrawal key={definition.id} {...props} definition={definition} />;
    return <RegularWalletWithdrawal {...props} />;
};
function RegularWalletWithdrawal(props: WithdrawPageProps) {
    const model = useWalletWithdrawalController(props);
    const { reportWalletActionFeedback } = useSwapDataUpdate();
    const { showProgress = true } = useWalletWithdrawalState();
    useClientLayoutEffect(() => reportWalletActionFeedback(model.feedback), [reportWalletActionFeedback, model.feedback]);
    return <>{showProgress ? <ProgressPanelView data={getWalletProgress(model.walletProgress)} /> : null}{model.controls}</>;
}


type TransferTokenButtonProps = {
    savedTransactionHash?: string;
    chainId?: number;
    swapData: SwapBasicData,
    refuel: boolean,
}
export function useTransferTokenController({
    savedTransactionHash,
    chainId,
    swapData,
    refuel
}: TransferTokenButtonProps, active = true) {
    const [buttonClicked, setButtonClicked] = useState(false)
    const [error, setError] = useState<Error | undefined>()
    const [isSignatureError, setIsSignatureError] = useState(false)
    const pendingOperations = useRef(0);
    const wasActive = useRef(active);
    useClientLayoutEffect(() => {
        const becameEligible = active && !wasActive.current;
        wasActive.current = active;
        if (!becameEligible || pendingOperations.current > 0) return;
        setButtonClicked(false);
        setError(undefined);
        setIsSignatureError(false);
    }, [active]);
    const hasSubmittedTransfer = useHasSubmittedWalletTransaction();

    const selectedSourceAccount = useSelectedAccount("from", swapData.source_network.name);

    const { networks } = useSettingsState()
    const networkWithTokens = networks.find(n => n.name === swapData.source_network.name)

    const { provider, wallets } = useWallet(swapData.source_network, "withdrawal")
    const { balances } = useBalance(active ? selectedSourceAccount?.address : undefined, networkWithTokens)
    const wallet = wallets.find(w => w.id === selectedSourceAccount?.id)
    const { executeTransfer } = useTransfer()
    const { signGaslessDeposit, isGaslessSupported } = useGasless()
    // Backend observation must continue when the wallet's RPC is unavailable.
    const rpcHealth = useRpcHealth(swapData.source_network, active && !hasSubmittedTransfer)
    const rpcUnhealthy = !hasSubmittedTransfer && rpcHealth?.health.status === 'unhealthy'
    const selectionKey = withdrawalSelectionKey(swapData.source_network.name, selectedSourceAccount, wallet);
    const selectionScope = useWithdrawalScope(selectionKey);
    useClientLayoutEffect(() => {
        setButtonClicked(false);
        setError(undefined);
        setIsSignatureError(false);
    }, [selectionKey]);

    const clickHandler = useCallback(async (transferProps: TransferProps) => {
        const { amount, depositAddress } = transferProps
        const signal = selectionScope.current?.signal;
        pendingOperations.current++;
        setButtonClicked(true)
        setError(undefined)
        try {
            if (!depositAddress)
                throw new Error('Missing deposit address')
            if (amount == undefined)
                throw new Error('Missing amount')
            if (!wallet)
                throw new Error('No selected account')

            const resolvedTransferProps: TransferProps = {
                ...transferProps,
                token: transferProps.token ?? swapData.source_token,
                selectedWallet: wallet,
                network: transferProps.network ?? swapData.source_network,
                balances,
                userDestinationAddress: swapData.destination_address,
            }

            try {
                const tx = await executeTransfer(resolvedTransferProps, wallet)

                if (!tx)
                    throw new Error('No transaction')

                if (tx) {
                    return tx
                }
            } catch (e) {
                if (typeof e === 'string' && e?.includes('No transfer provider found for network:')) {
                    signal?.throwIfAborted();
                    if (!provider?.transfer) throw new Error('No provider transfer')

                    const tx = await provider.transfer(resolvedTransferProps, wallet)

                    if (!tx)
                        throw new Error('No transaction')

                    if (tx) {
                        return tx
                    }
                } else {
                    throw e
                }

            }
        } catch (e) {
            if (!signal?.aborted) {
                setIsSignatureError(false);
                setError(e);
            }
            throw e;
        } finally {
            pendingOperations.current--;
        }
    }, [executeTransfer, chainId, selectedSourceAccount?.address, wallet, swapData, balances])

    const signHandler: GaslessSigner = useCallback(async (signAction) => {
        const signal = selectionScope.current?.signal;
        pendingOperations.current++;
        setButtonClicked(true)
        setError(undefined)
        try {
            if (!signAction.typed_data)
                throw new Error('Missing typed data for gasless deposit')
            if (!selectedSourceAccount?.address)
                throw new Error('No selected account')
            return await signGaslessDeposit({
                network: swapData.source_network,
                address: selectedSourceAccount.address,
                typedData: signAction.typed_data,
                wallet,
            })
        } catch (e) {
            if (!signal?.aborted) {
                setIsSignatureError(true);
                setError(e);
            }
            throw e;
        } finally {
            pendingOperations.current--;
        }
    }, [signGaslessDeposit, swapData.source_network, selectedSourceAccount?.address, wallet])

    const errorMessage = useActionMessage({
        error: buttonClicked ? error : undefined, isSignatureError, isLoading: false,
        selectedSourceAddress: selectedSourceAccount?.address || '', sourceNetwork: swapData.source_network, active,
    });
    return {
        rpcMessage: rpcUnhealthy ? (
            <TransferBlock reasonCode="rpc_unhealthy" path="TransferTokenButton"
                reason={rpcHealth.health.status === 'unhealthy' ? rpcHealth.health.reason : undefined}>
                <RPCUnhealthyMessage
                    network={swapData.source_network}
                    suggestRpcForCurrentChain={rpcHealth.suggestRpcForCurrentChain}
                    isSuggestingRpc={rpcHealth.isSuggestingRpc}
                    checkManually={rpcHealth.checkManually}
                />
            </TransferBlock>
        ) : null,
        sendProps: {
            errorMessage,
            onClick: clickHandler,
            onSign: isGaslessSupported(swapData.source_network) ? signHandler : undefined,
            onWalletActionError: (cause: unknown) => {
                setButtonClicked(true);
                setIsSignatureError(false);
                setError(cause instanceof Error ? cause : new Error('Wallet request failed', { cause }));
            },
            error: !!error && buttonClicked,
            walletError: error,
            isSignatureError,
            clearError: () => setError(undefined),
            swapData,
            refuel,
        },
    };
}
