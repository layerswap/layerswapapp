import { type Wallet } from '@layerswap/widget-types';
import { ComponentProps, FC, useCallback, useMemo, useRef, useState } from "react";
import { WalletIcon } from "@layerswap/ui-kit/components";
import { ActionData } from "./sharedTypes";
import SubmitButton, { SubmitButtonProps } from "@/components/Buttons/submitButton";
import useWallet from "@/hooks/useWallet";
import { useSwapDataState, useSwapDataUpdate } from "@/context/swap";
import { Loader2 } from "lucide-react";
import { ErrorDisplay } from "@/components/Pages/Swap/Form/SecondaryComponents/validationError/ErrorDisplay";
import ErrorDismissButton from "@/components/Pages/Swap/Form/SecondaryComponents/validationError/ErrorDismissButton";
import FailIcon from "@/components/Icons/FailIcon";
import WalletMessage from "../../messages/Message";
import { useConnectModal } from "@/components/Wallet/WalletModal";
import { Network, NetworkRoute } from "@layerswap/widget-types";
import { useInitialSettings, useSettingsState } from "@/context/settings";
import { useSwapTransactionStore } from "@/stores/swapTransactionStore";
import { useGaslessPreferenceStore } from "@/stores/gaslessPreferenceStore";
import LayerSwapApiClient, { DepositAction, SwapBasicData, SwapDetails } from "@/lib/apiClients/layerSwapApiClient";
import { sleep } from "@layerswap/utils";
import { isDiffByPercent } from "@/components/utils/numbers";
import { useWalletWithdrawalState } from "@/context/withdrawalContext";
import { useSelectedAccount } from "@/context/swapAccounts";
import { SwapFormValues } from "../../../Form/SwapFormValues";
import { ErrorHandler } from "@/lib/ErrorHandler";
import { TokenBalance, TransferProps } from "@layerswap/widget-types";
import { resolvePriceImpactValues } from "@/lib/fees";
import InfoIcon from "@/components/Icons/InfoIcon";
import { useBalance } from "@/lib/balances/useBalance";
import useSWRGas from "@/lib/gases/useSWRGas";
import { useDepositSettings } from "@/context/depositSettings";
import { DepositExecutionContext, GaslessSigner, WalletTransfer, executeGaslessAuthorization, executeWalletTransfer, getActionableDepositAction, isSignAction, isTransferAction, requiresDepositActionRefresh } from "./depositExecution";
import DepositWorkflowProgress from "./DepositWorkflowProgress";

const layerswapApiClient = new LayerSwapApiClient()

export const ConnectWalletButton: FC<SubmitButtonProps> = ({ ...props }) => {
    const { swapBasicData } = useSwapDataState()
    const { source_network } = swapBasicData || {}
    const [loading, setLoading] = useState(false)
    const [connectError, setConnectError] = useState<string>("")
    const { provider } = useWallet(source_network, 'withdrawal')
    const { connect } = useConnectModal()

    const clickHandler = useCallback(async () => {
        try {
            setLoading(true)
            setConnectError("")

            if (!provider) throw new Error(`No provider from ${source_network?.name}`)

            await connect(provider)
        }
        catch (e) {
            setConnectError(e.message)
        }
        finally {
            setLoading(false)
        }
    }, [provider])

    return <div className="flex flex-col gap-2 w-full">
        {connectError ? (
            <ErrorDisplay
                icon={<FailIcon className="h-5 w-5" />}
                title="Couldn't connect wallet"
                message={connectError}
                action={
                    <ErrorDismissButton onClick={() => setConnectError("")} />
                }
            />
        ) : null}
        <ButtonWrapper
            onClick={props.onClick ?? clickHandler}
            icon={loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (props.icon ?? <WalletIcon className="stroke-2 w-6 h-6" />)}
            isDisabled={loading || props.isDisabled}
            isSubmitting={loading || props.isSubmitting}
            {...props}
        >
            Send from wallet
        </ButtonWrapper>
    </div>
}

export const ChangeNetworkMessage: FC<{ data: ActionData, network: string }> = ({ data, network }) => {
    if (data.isPending) {
        return <WalletMessage
            status="pending"
            header='Network switch required'
            details="Confirm switching the network with your wallet"
        />
    }
    else if (data.isError) {
        return <WalletMessage
            status="error"
            header='Network switch failed'
            details={`Please try again or switch your wallet network manually to ${network}`}
        />
    }
}

type ChangeNetworkProps = {
    chainId: number | string,
    network: Network,
}

export const ChangeNetworkButton: FC<ChangeNetworkProps> = (props) => {
    const { chainId, network } = props
    const [error, setError] = useState<Error | null>(null)
    const [isPending, setIsPending] = useState(false)

    const selectedSourceAccount = useSelectedAccount("from", network?.name);
    const { wallets } = useWallet(network, 'withdrawal')

    const clickHandler = useCallback(async () => {
        try {
            setIsPending(true)
            const selectedWallet = wallets.find(w => w.id === selectedSourceAccount?.id)
            if (!selectedWallet) throw new Error(`No selectedWallet for ${network?.name}`)
            if (!selectedSourceAccount) throw new Error(`No selectedSourceAccount for ${network?.name}`)
            if (!selectedSourceAccount.provider.switchChain) throw new Error(`No switchChain from ${network?.name}`)

            return await selectedSourceAccount.provider.switchChain(selectedWallet, chainId)
        } catch (e) {
            setError(e)
        } finally {
            setIsPending(false)
        }

    }, [selectedSourceAccount, chainId])

    return <>
        <ChangeNetworkMessage
            data={{
                isPending: isPending,
                isError: !!error,
                error
            }}
            network={network.display_name}
        />
        {
            !isPending &&
            <ButtonWrapper
                onClick={clickHandler}
                icon={<WalletIcon className="stroke-2 w-6 h-6" />}
            >
                {
                    error ? <span>Try again</span>
                        : <span>Switch network</span>
                }
            </ButtonWrapper>
        }
    </>
}

export const ButtonWrapper: FC<SubmitButtonProps> = ({
    ...props
}) => {
    return <SubmitButton
        text_align='center'
        buttonStyle='filled'
        size="medium"
        type="button"
        className="text-base my-1"
        {...props}
    >
        {props.children}
    </SubmitButton>
}

type ButtonWrapperProps = ComponentProps<typeof ButtonWrapper>;
type SendFromWalletButtonProps = Omit<ButtonWrapperProps, 'onClick'> & {
    error?: boolean;
    clearError?: () => void
    onClick: WalletTransfer
    onSign?: GaslessSigner
    swapData: SwapBasicData,
    refuel: boolean
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
    const switchToStandardTransfer = useGaslessPreferenceStore(s => s.switchToStandardTransfer)
    const clearGaslessUnavailable = useGaslessPreferenceStore(s => s.clearGaslessUnavailable)
    const { onWalletWithdrawalSuccess: onWalletWithdrawalSuccess, onCancelWithdrawal } = useWalletWithdrawalState();
    const { createSwap, mutateSwap, setSwapId, setQuoteLoading } = useSwapDataUpdate()
    const { setSwapTransaction } = useSwapTransactionStore();
    const initialSettings = useInitialSettings()

    const selectedSourceAccount = useSelectedAccount("from", swapBasicData.source_network?.name);

    const { networks } = useSettingsState()
    const networkWithTokens = swapBasicData.source_network && networks.find(n => n.name === swapBasicData.source_network?.name)
    const { balances } = useBalance(selectedSourceAccount?.address, networkWithTokens)

    const { wallets } = useWallet(swapBasicData.source_network, 'withdrawal')
    const { gasData } = useSWRGas(selectedSourceAccount?.address, networkWithTokens, swapBasicData.source_token, swapBasicData.requested_amount)
    const [actionStateText, setActionStateText] = useState<string | undefined>()
    const [loading, setLoading] = useState(false)
    const [showCriticalMarketPriceImpactButtons, setShowCriticalMarketPriceImpactButtons] = useState(false)
    const [workflowState, setWorkflowState] = useState<{ swapId: string, actions: DepositAction[], swapData?: SwapDetails }>()
    const executionInFlight = useRef(false)

    const activeWorkflowState = workflowState && workflowState.swapId === swapId ? workflowState : undefined
    const depositActions = activeWorkflowState
        ? activeWorkflowState.actions
        : depositActionsResponse
    const workflowProgress = <DepositWorkflowProgress actions={depositActions} isExecuting={loading} actionStateText={actionStateText} />

    const { actionButtonText } = useDepositSettings()

    const isMultiStepWorkflow = (depositActions?.filter(action => !!action.step).length ?? 0) > 1
    const workflowCompleted = !!depositActions?.length && depositActions.every(action => action.status === 'completed')
    const primaryActionText = actionButtonText || 'Approve and Swap'

    const priceImpactValues = useMemo(() => quote ? resolvePriceImpactValues(quote, refuel ? refuelData : undefined) : undefined, [quote, refuel]);
    const criticalMarketPriceImpact = useMemo(() => priceImpactValues?.criticalMarketPriceImpact, [priceImpactValues]);

    const executeWorkflow = async (forceNewSwap = false) => {
        if (executionInFlight.current) return
        executionInFlight.current = true
        let executionSwapId = forceNewSwap ? undefined : swapId
        try {
            const selectedWallet = wallets.find(w => w.id === selectedSourceAccount?.id)
            if (!selectedSourceAccount) {
                throw new Error('Selected source account is undefined')
            }
            if (!selectedWallet?.isActive) {
                throw new Error('Wallet is not active')
            }

            setLoading(true)
            clearError?.()
            setSwapError?.("")
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
            const error = e as Error;
            if (!useGaslessPreferenceStore.getState().gaslessUnavailable) {
                setSwapError?.(error.message || 'Could not complete the swap action')
            }
            ErrorHandler({
                type: 'SwapWithdrawalError',
                message: error.message,
                name: error.name,
                stack: error.stack,
                cause: error.cause,
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
        const maxAttempts = previousAction.step === 'approve_permit2' ? 60 : 10

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            if (attempt > 0) await sleep(2000)
            const response = await layerswapApiClient.GetSwapAsync(activeSwapId, sourceAddress)
            if (response?.error) throw response.error

            const latestActions = response?.data?.deposit_actions ?? []
            const failedStep = latestActions.find(action => action.status === 'failed')
            const nextAction = getActionableDepositAction(latestActions)
            const workflowCompleted = latestActions.length > 0 && latestActions.every(action => action.status === 'completed')
            const transitioned = workflowCompleted || (!!nextAction && nextAction.step !== previousAction.step)

            if (failedStep || transitioned) {
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

    const handleClick = () => executeWorkflow(false)
    const handleCriticalContinue = () => {
        setShowCriticalMarketPriceImpactButtons(false)
        executeWorkflow(false)
    }

    const retryGasless = () => {
        clearGaslessUnavailable()
        setSwapError?.(null)
        executeWorkflow(false)
    }

    const switchToStandard = () => {
        switchToStandardTransfer()
        setSwapError?.(null)
        executeWorkflow(true)
    }

    if (quoteIsLoading || loading)
        return (
            <>
                {workflowProgress}
                {isMultiStepWorkflow && loading ? null : (
                    <ButtonWrapper
                        {...props}
                        isSubmitting={true}
                        isDisabled={true}
                    >
                        {actionStateText || "Preparing…"}
                    </ButtonWrapper>
                )}
            </>
        )

    if (showCriticalMarketPriceImpactButtons) {
        return (<>
            {workflowProgress}
            {quote && priceImpactValues && <div className="py-1">
                <div className="flex items-start gap-2.5">
                    <span className="shrink-0"><InfoIcon className="w-5 h-5 text-warning-foreground" /></span>
                    <div className="flex flex-col gap-1.5 pr-4">
                        <p className="text-white font-semibold leading-4 text-base mt-0.5">Critical receiving amount</p>
                        <p className="text-priamry-text text-base font-normal leading-4.5"><span>By continuing, you agree to receive as low as </span><span className="text-warning-foreground text-nowrap">{quote.min_receive_amount} {quote.destination_token?.symbol} ($ {priceImpactValues.minReceiveAmountUSD})</span></p>
                    </div>
                </div>
            </div>}
            <ButtonWrapper
                {...props}
                onClick={handleCriticalContinue}
                buttonStyle="secondary"
                size="small"
                isSubmitting={false}
                isDisabled={false}
            >
                Continue anyway
            </ButtonWrapper>
            <ButtonWrapper
                {...props}
                size="small"
                onClick={() => onCancelWithdrawal?.()}
                isSubmitting={false}
                isDisabled={false}
            >
                Cancel & try another route
            </ButtonWrapper>
        </>
        )
    }
    return (
        <>
            {!!(!swapId && criticalMarketPriceImpact && quote?.destination_token && priceImpactValues && !error) && <div className="py-1">
                <div className="flex items-start gap-2.5">
                    <span className="shrink-0"><InfoIcon className="w-5 h-5 text-warning-foreground" /></span>
                    <div className="flex flex-col gap-1.5 pr-4">
                        <p className="text-primary-text font-medium leading-4 text-base mt-0.5">Critical receiving amount</p>
                        <p className="text-secondary-text text-sm leading-4.5"><span>The “receive at least” amount is affected by high price impact. You will receive at least </span><span>{quote.min_receive_amount} {quote.destination_token?.symbol} ($ {priceImpactValues.minReceiveAmountUSD}) </span></p>
                    </div>
                </div>
            </div>}
            {workflowProgress}
            {gaslessUnavailable ? (
                <div className="space-y-2">
                    {gaslessFailureStage === 'deposit' &&
                        <ButtonWrapper
                            {...props}
                            isSubmitting={props.isSubmitting || loading || quoteIsLoading}
                            onClick={retryGasless}
                            isDisabled={quoteIsLoading || !!quoteError}
                        >
                            Try again
                        </ButtonWrapper>
                    }
                    <ButtonWrapper
                        {...props}
                        buttonStyle={gaslessFailureStage === 'deposit' ? 'secondary' : 'filled'}
                        isSubmitting={props.isSubmitting || loading || quoteIsLoading}
                        onClick={switchToStandard}
                        isDisabled={quoteIsLoading || !!quoteError}
                    >
                        Switch to standard transfer
                    </ButtonWrapper>
                </div>
            ) : (
                <ButtonWrapper
                    {...props}
                    isSubmitting={props.isSubmitting || loading || quoteIsLoading}
                    onClick={handleClick}
                    isDisabled={quoteIsLoading || !!quoteError || workflowCompleted}
                >
                    {error || swapError ? 'Try again' : workflowCompleted ? 'Completed' : primaryActionText}
                </ButtonWrapper>
            )}
        </>
    )
}
