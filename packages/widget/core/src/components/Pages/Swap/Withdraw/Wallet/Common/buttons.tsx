import { useCallbacks } from '@/context/callbackProvider';
import { lifecycleContextFromSwap, lifecycleErrorDetails } from '@/lib/swapLifecycle';
import { useTransferBlocked } from '@/hooks/useTransferBlocked';
import { hasSwapExecutionProgress } from '@/helpers/swapProgress';
import { isGaslessCapableRoute, isGaslessDepositWorkflow } from '@/helpers/gasless';
import { isUserRejection } from './isUserRejection';
import useSWR, { useSWRConfig } from 'swr';
import type { ApiResponse } from '@/Models/ApiResponse';
import { SubmitButtonProps } from '@/components/Buttons/submitButton';
import { isDiffByPercent } from '@/components/utils/numbers';
import { useConnectModal } from '@/components/Wallet/WalletModal';
import { useDepositSettings } from '@/context/depositSettings';
import { useInitialSettings, useSettingsState } from '@/context/settings';
import { useSwapDataState, useSwapDataUpdate } from '@/context/swap';
import { useSelectedAccount } from '@/context/swapAccounts';
import { useWalletWithdrawalState } from '@/context/withdrawalContext';
import useWallet from '@/hooks/useWallet';
import LayerSwapApiClient, {
    DepositAction,
    SwapBasicData,
    SwapDetails,
} from '@/lib/apiClients/layerSwapApiClient';
import { useBalance } from '@/lib/balances/useBalance';
import { ErrorHandler } from '@/lib/ErrorHandler';
import { resolvePriceImpactValues } from '@/lib/fees';
import useSWRGas from '@/lib/gases/useSWRGas';
import { useGaslessPreferenceStore } from '@/stores/gaslessPreferenceStore';
import { useGaslessAuthorizationStore, useSwapTransactionStore } from '@/stores/swapTransactionStore';
import { sleep } from '@layerswap/utils';
import { Network, NetworkRoute } from '@layerswap/widget-types';
import { ComponentProps, FC, type ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { SwapFormValues } from '../../../Form/SwapFormValues';
import {
    ButtonWrapper,
    ChangeNetworkView,
    ConnectWalletView,
    SendTransactionView,
} from '../../Presentation/WalletActionsView';
import {
    DepositExecutionContext,
    GaslessSigner,
    WalletTransfer,
    executeGaslessAuthorization,
    executeWalletTransfer,
    isSignAction,
    isTransferAction,
    getActionableDepositAction,
    requiresDepositActionRefresh,
} from './depositExecution';
export {
    ButtonWrapper,
    ChangeNetworkMessage,
} from '../../Presentation/WalletActionsView';

const layerswapApiClient = new LayerSwapApiClient();
const DEPOSIT_ACTIONS_POLL_INTERVAL_MS = 5000;
const depositActionsKey = (swapId: string, sourceAddress: string) =>
    `/swaps/${swapId}/deposit_actions?source_address=${sourceAddress}`;

export const ConnectWalletButton: FC<SubmitButtonProps> = ({ ...props }) => {
    const { swapBasicData, swapDetails } = useSwapDataState()
    const { source_network } = swapBasicData || {}
    const [loading, setLoading] = useState(false)
    const [connectError, setConnectError] = useState<string>("")
    const { provider } = useWallet(source_network, 'withdrawal')
    const { connect } = useConnectModal()
    const { onSwapLifecycle } = useCallbacks()

    const clickHandler = useCallback(async () => {
        const lifecycleContext = swapBasicData ? lifecycleContextFromSwap(swapBasicData, swapDetails) : {}
        onSwapLifecycle({
            step: 'wallet_connection_started',
            stage: 'wallet_connection',
            outcome: 'started',
            path: 'ConnectWalletButton',
            provider: provider?.name,
            ...lifecycleContext,
        })
        try {
            setLoading(true)
            setConnectError("")

            if (!provider) throw new Error(`No provider from ${source_network?.name}`)

            const wallet = await connect(provider)
            onSwapLifecycle({
                step: wallet ? 'wallet_connected' : 'wallet_connection_failed',
                stage: 'wallet_connection',
                outcome: wallet ? 'succeeded' : 'cancelled',
                path: 'ConnectWalletButton',
                provider: wallet?.providerName || provider.name,
                reasonCode: wallet ? undefined : 'connection_modal_cancelled',
                ...lifecycleContext,
            })
        }
        catch (e) {
            setConnectError(e.message)
            const rejected = isUserRejection(e)
            const errorDetails = lifecycleErrorDetails(e)
            onSwapLifecycle({
                step: 'wallet_connection_failed',
                stage: 'wallet_connection',
                outcome: rejected ? 'rejected' : 'failed',
                path: 'ConnectWalletButton',
                provider: provider?.name,
                ...errorDetails,
                reasonCode: rejected ? 'user_rejected' : errorDetails.reasonCode,
                ...lifecycleContext,
            })
        }
        finally {
            setLoading(false)
        }
    }, [connect, onSwapLifecycle, provider, source_network?.name, swapBasicData, swapDetails])

    return (
        <ConnectWalletView
            {...props}
            loading={loading}
            connectError={connectError}
            onConnect={clickHandler}
            onDismiss={() => setConnectError('')}
        />
    );
};

type ChangeNetworkProps = {
    chainId: number | string;
    network: Network;
};

export const ChangeNetworkButton: FC<ChangeNetworkProps> = (props) => {
    const { chainId, network } = props
    const [error, setError] = useState<Error | null>(null)
    const [isPending, setIsPending] = useState(false)

    const selectedSourceAccount = useSelectedAccount("from", network?.name);
    const { wallets } = useWallet(network, 'withdrawal')
    const { swapBasicData, swapDetails } = useSwapDataState()
    const { onSwapLifecycle } = useCallbacks()

    const clickHandler = useCallback(async () => {
        const lifecycleContext = swapBasicData ? lifecycleContextFromSwap(swapBasicData, swapDetails) : {}
        const selectedWallet = wallets.find(w => w.id === selectedSourceAccount?.id)
        onSwapLifecycle({
            step: 'network_switch_started',
            stage: 'network_switch',
            outcome: 'started',
            path: 'ChangeNetworkButton',
            action: `switch_to_${chainId}`,
            provider: selectedWallet?.providerName,
            ...lifecycleContext,
        })
        try {
            setIsPending(true)
            if (!selectedWallet) throw new Error(`No selectedWallet for ${network?.name}`)
            if (!selectedSourceAccount) throw new Error(`No selectedSourceAccount for ${network?.name}`)
            if (!selectedSourceAccount.provider.switchChain) throw new Error(`No switchChain from ${network?.name}`)

            await selectedSourceAccount.provider.switchChain(selectedWallet, chainId)
            onSwapLifecycle({
                step: 'network_switched',
                stage: 'network_switch',
                outcome: 'succeeded',
                path: 'ChangeNetworkButton',
                action: `switch_to_${chainId}`,
                provider: selectedWallet.providerName,
                ...lifecycleContext,
            })
        } catch (e) {
            setError(e)
            const rejected = isUserRejection(e)
            const errorDetails = lifecycleErrorDetails(e)
            onSwapLifecycle({
                step: rejected ? 'network_switch_rejected' : 'network_switch_failed',
                stage: 'network_switch',
                outcome: rejected ? 'rejected' : 'failed',
                path: 'ChangeNetworkButton',
                action: `switch_to_${chainId}`,
                provider: selectedWallet?.providerName,
                ...errorDetails,
                reasonCode: rejected ? 'user_rejected' : errorDetails.reasonCode,
                ...lifecycleContext,
            })
        } finally {
            setIsPending(false)
        }

    }, [chainId, network?.name, onSwapLifecycle, selectedSourceAccount, swapBasicData, swapDetails, wallets])

    return (
        <ChangeNetworkView
            network={network.display_name}
            isPending={isPending}
            error={error}
            onSwitch={clickHandler}
        />
    );
};

type ButtonWrapperProps = ComponentProps<typeof ButtonWrapper>;
type SendFromWalletButtonProps = Omit<ButtonWrapperProps, 'onClick'> & {
    errorMessage?: ReactNode;
    error?: boolean;
    clearError?: () => void;
    onClick: WalletTransfer;
    onSign?: GaslessSigner;
    swapData: SwapBasicData;
    refuel: boolean;
};

export const SendTransactionButton: FC<SendFromWalletButtonProps> = ({
    error,
    clearError,
    onClick,
    onSign,
    swapData: swapBasicData,
    refuel,
    ...props
}) => {
    const { quote, quoteIsLoading, quoteError, swapId, swapDetails, depositActionsResponse, refuel: refuelData, swapError, setSwapError } = useSwapDataState()
    const gaslessUnavailable = useGaslessPreferenceStore(s => s.gaslessUnavailable)
    const gaslessFailureStage = useGaslessPreferenceStore(s => s.gaslessFailureStage)
    const gaslessEnabled = useGaslessPreferenceStore(s => s.gaslessEnabled)
    const switchToStandardTransfer = useGaslessPreferenceStore(s => s.switchToStandardTransfer)
    const clearGaslessUnavailable = useGaslessPreferenceStore(s => s.clearGaslessUnavailable)
    const { onWalletWithdrawalSuccess: onWalletWithdrawalSuccess, onCancelWithdrawal } = useWalletWithdrawalState();
    const { createSwap, mutateSwap, setSwapId, setQuoteLoading } = useSwapDataUpdate()
    const setSwapTransaction = useSwapTransactionStore(state => state.setSwapTransaction)
    const storedWalletTransaction = useSwapTransactionStore(
        state => swapId ? state.swapTransactions[swapId] : undefined,
    )
    const gaslessAuthorization = useGaslessAuthorizationStore(
        state => swapId ? state.authorizations[swapId] : undefined,
    )
    const initialSettings = useInitialSettings()
    const { onSwapLifecycle } = useCallbacks()

    const selectedSourceAccount = useSelectedAccount("from", swapBasicData.source_network?.name);

    const { networks } = useSettingsState()
    const networkWithTokens = swapBasicData.source_network && networks.find(n => n.name === swapBasicData.source_network?.name)
    const { balances } = useBalance(selectedSourceAccount?.address, networkWithTokens)

    const { wallets } = useWallet(swapBasicData.source_network, 'withdrawal')
    const selectedWallet = wallets.find(wallet => wallet.id === selectedSourceAccount?.id)
    const { gasData } = useSWRGas(selectedSourceAccount?.address, networkWithTokens, swapBasicData.source_token, swapBasicData.requested_amount)
    const [actionStateText, setActionStateText] = useState<string | undefined>()
    const [loading, setLoading] = useState(false)
    const [showCriticalMarketPriceImpactButtons, setShowCriticalMarketPriceImpactButtons] = useState(false)
    const [workflowState, setWorkflowState] = useState<{ swapId: string, actions: DepositAction[], swapData?: SwapDetails }>()
    const executionInFlight = useRef(false)
    const { mutate: mutateCache } = useSWRConfig()
    // Share the context's cache, but keep refreshing while this wallet flow is
    // mounted, including while idle or waiting for a retry after rejection.
    const { data: polledDepositActions } = useSWR<ApiResponse<DepositAction[]>>(
        swapId && selectedSourceAccount?.address ? depositActionsKey(swapId, selectedSourceAccount.address) : null,
        layerswapApiClient.fetcher,
        { refreshInterval: DEPOSIT_ACTIONS_POLL_INTERVAL_MS },
    )

    const activeWorkflowState = workflowState && workflowState.swapId === swapId ? workflowState : undefined
    const depositActions = polledDepositActions?.data ?? activeWorkflowState?.actions ?? depositActionsResponse
    const { actionButtonText } = useDepositSettings()

    const hasProgress = useMemo(() => hasSwapExecutionProgress({
        swapDetails,
        depositActions,
        storedWalletTransaction,
        gaslessAuthorization,
    }), [swapDetails, depositActions, storedWalletTransaction, gaslessAuthorization])
    const desiredGasless = gaslessEnabled && isGaslessCapableRoute({
        depositMethod: swapBasicData.use_deposit_address ? 'deposit_address' : 'wallet',
        supportsGaslessDeposit: swapBasicData.source_token?.supports_gasless_deposit,
        sourceTokenContract: swapBasicData.source_token?.contract,
        gaslessStandard: swapBasicData.source_token?.gasless_standard,
        sourceIsSupported: !!selectedWallet?.asSourceSupportedNetworks?.includes(swapBasicData.source_network.name),
        sourceAddress: selectedSourceAccount?.address,
    })
    const currentGasless = isGaslessDepositWorkflow(depositActions)
    const flowPreferenceChanged = !!swapId
        && currentGasless !== undefined
        && currentGasless !== desiredGasless
    const priceImpactValues = useMemo(() => quote ? resolvePriceImpactValues(quote, refuel ? refuelData : undefined) : undefined, [quote, refuel]);
    const criticalMarketPriceImpact = useMemo(() => priceImpactValues?.criticalMarketPriceImpact, [priceImpactValues]);

    useTransferBlocked(showCriticalMarketPriceImpactButtons ? 'critical_price_impact' : undefined,
        lifecycleContextFromSwap(swapBasicData, swapDetails), 'SendTransactionButton')

    const executeWorkflow = async (requestFreshSwap = false) => {
        if (executionInFlight.current) return
        executionInFlight.current = true
        // Explicit mode changes can start a new swap before execution has progressed.
        // Ordinary wallet retries reuse the swap with freshly fetched deposit actions.
        const forceNewSwap = (requestFreshSwap || flowPreferenceChanged) && !hasProgress
        let executionSwapId = forceNewSwap ? undefined : swapId
        try {
            if (!selectedSourceAccount) {
                throw new Error('Selected source account is undefined')
            }
            if (!selectedWallet?.isActive) {
                throw new Error('Wallet is not active')
            }

            setLoading(true)
            clearError?.()
            setSwapError?.("")
            if (forceNewSwap && swapId) {
                useGaslessAuthorizationStore.getState().removeGaslessAuthorization(swapId)
                useSwapTransactionStore.getState().removeSwapTransaction(swapId)
            }
            let swapData: SwapDetails | undefined = forceNewSwap ? undefined : activeWorkflowState?.swapData ?? swapDetails
            let activeDepositActions = forceNewSwap ? undefined : depositActions;

            if (!executionSwapId || !swapData) {
                setActionStateText("Preparing swap…")
                setSwapId(undefined)
                setWorkflowState(undefined)

                const swapValues: SwapFormValues = {
                    amount: swapBasicData.requested_amount.toString(),
                    from: swapBasicData.source_network as NetworkRoute,
                    to: swapBasicData.destination_network as NetworkRoute,
                    fromAsset: swapBasicData.source_token,
                    toAsset: swapBasicData.destination_token,
                    refuel: refuel,
                    destination_address: swapBasicData.destination_address,
                    depositMethod: 'wallet',
                }

                const newSwapData = await createSwap(swapValues, initialSettings).catch((e: any) => {
                    // Failed gasless attempt is surfaced as the switch prompt, not a raw API error.
                    if (useGaslessPreferenceStore.getState().gaslessUnavailable) {
                        setSwapError?.(null)
                    } else {
                        setSwapError?.(e?.response?.data?.error?.message || e?.message || 'Could not create swap')
                    }
                    throw e
                });
                const newSwapId = newSwapData?.swap?.id;
                if (!newSwapId) {
                    throw new Error('Swap ID is undefined');
                }

                executionSwapId = newSwapId
                if (newSwapData.deposit_actions) {
                    await mutateCache(depositActionsKey(newSwapId, selectedSourceAccount.address), { data: newSwapData.deposit_actions }, false)
                }
                setWorkflowState(newSwapData.deposit_actions ? { swapId: newSwapId, actions: newSwapData.deposit_actions, swapData: newSwapData.swap } : undefined)
                setSwapId(newSwapId)

                const priceImpactValues = newSwapData.quote ? resolvePriceImpactValues(newSwapData.quote, newSwapData.refuel) : undefined;

                if (priceImpactValues?.criticalMarketPriceImpact) {
                    setShowCriticalMarketPriceImpactButtons(true)
                    return
                }

                if (isDiffByPercent(quote?.receive_amount, newSwapData.quote.receive_amount, 2)) {
                    setActionStateText("Updating quote…")
                    setQuoteLoading(true)
                    await sleep(3500)
                    setQuoteLoading(false)
                }
                swapData = newSwapData.swap
                activeDepositActions = newSwapData.deposit_actions;
            } else {
                // A signature or prepared transaction may have expired while the user
                // paused or rejected a prompt. Never retry the cached action payload.
                setActionStateText("Refreshing swap…")
                const refreshed = await mutateCache<ApiResponse<DepositAction[]>>(
                    depositActionsKey(executionSwapId, selectedSourceAccount.address),
                    layerswapApiClient.GetDepositActionsAsync(executionSwapId, selectedSourceAccount.address).then(response => {
                        if (response?.error) throw response.error
                        if (!response?.data?.length) throw new Error('No deposit actions')
                        return response
                    }),
                    { revalidate: false },
                )
                activeDepositActions = refreshed?.data
                if (activeDepositActions) {
                    setWorkflowState({ swapId: executionSwapId, actions: activeDepositActions, swapData })
                }
            }
            if (!activeDepositActions?.length) {
                throw new Error('No deposit actions')
            }

            if (!swapData) {
                throw new Error('No swap data')
            }

            // The server owns the workflow state. Execute the currently actionable
            // item, wait for the swap response to expose the next one, then continue
            // without requiring another click in the Layerswap UI.
            const maxActions = Math.max(activeDepositActions.length, 1) + 1
            for (let executedActions = 0; executedActions < maxActions; executedActions++) {
                const currentAction = getActionableDepositAction(activeDepositActions)
                if (!currentAction) {
                    const failedStep = activeDepositActions.find(action => action.status === 'failed')
                    if (failedStep) throw new Error(failedStep.detail || 'The swap action failed')
                    if (activeDepositActions.every(action => action.status === 'completed')) {
                        onWalletWithdrawalSuccess?.()
                        return
                    }
                    throw new Error('No deposit action is currently available')
                }

                const executionContext: DepositExecutionContext = {
                    swapData,
                    depositActions: activeDepositActions,
                    swapBasicData,
                    selectedWallet,
                    sourceAddress: selectedSourceAccount.address,
                    layerswapApiClient,
                    setActionStateText,
                    setSwapTransaction,
                    setSwapError,
                    onSuccess: () => onWalletWithdrawalSuccess?.(),
                    onLifecycle: onSwapLifecycle,
                }

                if (isSignAction(currentAction)) {
                    if (!onSign) throw new Error('This wallet cannot sign the requested authorization')
                    await executeGaslessAuthorization(executionContext, onSign, currentAction)
                } else if (isTransferAction(currentAction)) {
                    await executeWalletTransfer(executionContext, onClick, currentAction)
                }

                if (!requiresDepositActionRefresh(currentAction, activeDepositActions)) return

                setActionStateText(currentAction.step === 'approve_permit2' ? 'Confirming approval…' : 'Preparing transaction…')
                activeDepositActions = await waitForSwapActionTransition({
                    swapId: swapData.id,
                    sourceAddress: selectedSourceAccount.address,
                    previousAction: currentAction,
                })
                setWorkflowState({ swapId: swapData.id, actions: activeDepositActions, swapData })
            }

            throw new Error('The swap workflow has more actions than expected')
        }
        catch (e) {
            if (isUserRejection(e)) {
                setSwapError?.(null)
                return
            }
            const error = e as Error;
            if (!useGaslessPreferenceStore.getState().gaslessUnavailable) {
                setSwapError?.(error.message || 'Could not complete the swap action')
            }
            ErrorHandler({
                type: 'SwapWithdrawalError',
                message: error.message,
                name: error.name,
                stack: error.stack,
                cause: error,
                swapId: executionSwapId,
                fromAddress: selectedSourceAccount?.address,
                toAddress: swapBasicData?.destination_address
            });

            const walletBalance = balances?.find(b => b?.network === swapBasicData.source_network?.name && b?.token === swapBasicData.source_token?.symbol)
            if (walletBalance?.isNativeCurrency && gasData?.gas && walletBalance?.amount != null) {
                const requestedAmount = Number(swapBasicData.requested_amount)
                const difference = walletBalance.amount - requestedAmount
                if (difference >= 0 && difference < 5 * gasData.gas) {
                    ErrorHandler({
                        type: 'GasMiscalculation',
                        cause: error,
                        message: (e as Error)?.message,
                        name: (e as Error)?.name,
                        requestedAmount,
                        walletBalance: walletBalance.amount,
                        calculatedGas: gasData.gas,
                        difference,
                        network: swapBasicData.source_network?.name,
                        token: swapBasicData.source_token?.symbol,
                    })
                }
            }
        }
        finally {
            executionInFlight.current = false
            setLoading(false)
        }
    }

    const waitForSwapActionTransition = async ({
        swapId: activeSwapId,
        sourceAddress,
        previousAction,
    }: {
        swapId: string,
        sourceAddress: string,
        previousAction: DepositAction,
    }): Promise<DepositAction[]> => {
        for (let attempt = 0; attempt < 69; attempt++) {
            if (attempt > 0) await sleep(2000)
            const response = await layerswapApiClient.GetSwapAsync(activeSwapId, sourceAddress)
            if (response?.error) throw response.error

            const latestActions = response?.data?.deposit_actions ?? []
            const failedStep = latestActions.find(action => action.status === 'failed')
            const nextAction = getActionableDepositAction(latestActions)
            const workflowCompleted = latestActions.length > 0 && latestActions.every(action => action.status === 'completed')
            const transitioned = workflowCompleted || (!!nextAction && nextAction.step !== previousAction.step)

            if (failedStep || transitioned) {
                await mutateCache(depositActionsKey(activeSwapId, sourceAddress), { data: latestActions }, false)
                await mutateSwap(response, false)
                setWorkflowState(previous => ({
                    swapId: activeSwapId,
                    actions: latestActions,
                    swapData: previous?.swapId === activeSwapId ? previous.swapData : undefined,
                }))
            }

            if (failedStep) throw new Error(failedStep.detail || 'The swap action failed')
            if (transitioned) return latestActions
        }

        throw new Error('The transaction is still confirming. Please wait a moment and try again.')
    }

    const handleClick = () => {
        if (error || swapError) {
            onSwapLifecycle({
                step: 'retry_requested',
                stage: 'wallet_action',
                outcome: 'started',
                path: 'SendTransactionButton',
                reasonCode: 'wallet_action_retry',
                ...lifecycleContextFromSwap(swapBasicData, swapDetails),
            })
        }

        return executeWorkflow()
    }
    const handleCriticalContinue = () => {
        setShowCriticalMarketPriceImpactButtons(false)
        executeWorkflow(false)
    }

    const retryGasless = () => {
        onSwapLifecycle({
            step: 'retry_requested',
            stage: 'wallet_action',
            outcome: 'started',
            path: 'SendTransactionButton',
            reasonCode: 'retry_gasless',
            ...lifecycleContextFromSwap(swapBasicData, swapDetails),
        })
        clearGaslessUnavailable()
        setSwapError?.(null)
        executeWorkflow(true)
    }

    const switchToStandard = () => {
        onSwapLifecycle({
            step: 'retry_requested',
            stage: 'wallet_action',
            outcome: 'started',
            path: 'SendTransactionButton',
            reasonCode: 'switch_to_standard_transfer',
            ...lifecycleContextFromSwap(swapBasicData, swapDetails),
        })
        switchToStandardTransfer()
        setSwapError?.(null)
        executeWorkflow(true)
    }

    const handleCancelWithdrawal = () => {
        onSwapLifecycle({
            step: 'retry_requested',
            stage: 'form',
            outcome: 'started',
            path: 'CriticalMarketPriceImpact',
            reasonCode: 'select_another_route',
            ...lifecycleContextFromSwap(swapBasicData, swapDetails),
        })
        onCancelWithdrawal?.()
    }

    return (
        <SendTransactionView
            {...props}
            quote={quote}
            quoteIsLoading={quoteIsLoading}
            quoteError={!!quoteError}
            loading={loading}
            actionStateText={actionStateText}
            actionButtonText={actionButtonText}
            depositActions={depositActions}
            error={error}
            swapError={!!swapError}
            swapId={swapId}
            criticalMarketPriceImpact={criticalMarketPriceImpact}
            showCriticalMarketPriceImpactButtons={showCriticalMarketPriceImpactButtons}
            priceImpactValues={priceImpactValues}
            gaslessUnavailable={gaslessUnavailable}
            gaslessFailureStage={gaslessFailureStage}
            handleClick={handleClick}
            handleCriticalContinue={handleCriticalContinue}
            retryGasless={retryGasless}
            switchToStandard={switchToStandard}
            onCancelWithdrawal={handleCancelWithdrawal}
        />
    );
};
