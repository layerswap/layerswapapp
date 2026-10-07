import { type Wallet } from '@layerswap/widget-types';
import { ComponentProps, FC, useCallback, useMemo, useState } from "react";
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
import { NetworkRoute } from "@layerswap/widget-types";
import { useInitialSettings, useSettingsState } from "@/context/settings";
import { useSwapTransactionStore } from "@/stores/swapTransactionStore";
import { useGaslessPreferenceStore } from "@/stores/gaslessPreferenceStore";
import LayerSwapApiClient, { SwapBasicData, SwapDetails } from "@/lib/apiClients/layerSwapApiClient";
import { sleep } from "@layerswap/utils";
import { isDiffByPercent } from "@/components/utils/numbers";
import { useWalletWithdrawalState } from "@/context/withdrawalContext";
import { useSelectedAccount } from "@/context/swapAccounts";
import { SwapFormValues } from "../../../Form/SwapFormValues";
import { ErrorHandler } from "@/lib/ErrorHandler";
import { TokenBalance, TransferProps } from "@layerswap/widget-types";
import { resolvePriceImpactValues } from "@/lib/fees";
import InfoIcon from "@/components/Icons/InfoIcon";
import { ICON_CLASSES_WARNING } from "@/components/Pages/Swap/Form/SecondaryComponents/validationError/constants";
import { useBalance } from "@/lib/balances/useBalance";
import useSWRGas from "@/lib/gases/useSWRGas";
import { useDepositSettings } from "@/context/depositSettings";
import { DepositExecutionContext, GaslessSigner, WalletTransfer, executeGaslessAuthorization, executeWalletTransfer, isSignAction } from "./depositExecution";
import { useCallbacks } from "@/context/callbackProvider";
import { lifecycleContextFromSwap, lifecycleErrorDetails } from "@/lib/swapLifecycle";
import { isUserRejection } from "./isUserRejection";
import { useTransferBlocked } from "@/hooks/useTransferBlocked";
import { NetworkSwitchError, ensureSourceChain, networkSwitchFailureReason } from "./ensureSourceChain";

const layerswapApiClient = new LayerSwapApiClient()
const NO_NETWORK_SWITCH: ActionData = { isPending: false, isError: false, error: null }
const SWITCH_PROMPT_DELAY_MS = 1000

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
            header='Switch network'
            details={`Confirm switching to ${network} in your wallet`}
        />
    }
    if (!data.isError) return null
    const kind = data.error instanceof NetworkSwitchError ? data.error.kind : 'failed'
    if (kind === 'pending') {
        return <WalletMessage
            status="pending"
            header='Network switch still waiting'
            details={`Your wallet is still asking to switch to ${network}. Confirm it there, then try again`}
        />
    }
    if (kind === 'timeout') {
        return <WalletMessage
            status="error"
            header='Network switch timed out'
            details={`Your wallet didn't respond. Try again or switch your wallet network manually to ${network}`}
        />
    }
    const reason = networkSwitchFailureReason(data.error)
    return <WalletMessage
        status="error"
        header='Network switch failed'
        details={reason
            ? `${reason} Please try again or switch your wallet network manually to ${network}.`
            : `Please try again or switch your wallet network manually to ${network}`}
    />
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
    const { createSwap, setSwapId, setQuoteLoading } = useSwapDataUpdate()
    const { setSwapTransaction } = useSwapTransactionStore();
    const initialSettings = useInitialSettings()
    const { onSwapLifecycle } = useCallbacks()

    const selectedSourceAccount = useSelectedAccount("from", swapBasicData.source_network?.name);

    const { networks } = useSettingsState()
    const networkWithTokens = swapBasicData.source_network && networks.find(n => n.name === swapBasicData.source_network?.name)
    const { balances } = useBalance(selectedSourceAccount?.address, networkWithTokens)

    const { wallets } = useWallet(swapBasicData.source_network, 'withdrawal')
    const { gasData } = useSWRGas(selectedSourceAccount?.address, networkWithTokens, swapBasicData.source_token, swapBasicData.requested_amount)
    const [actionStateText, setActionStateText] = useState<string | undefined>()
    const [loading, setLoading] = useState(false)
    const [showCriticalMarketPriceImpactButtons, setShowCriticalMarketPriceImpactButtons] = useState(false)
    const [networkSwitch, setNetworkSwitch] = useState<ActionData>(NO_NETWORK_SWITCH)

    const { actionButtonText } = useDepositSettings()

    const priceImpactValues = useMemo(() => quote ? resolvePriceImpactValues(quote, refuel ? refuelData : undefined) : undefined, [quote, refuel]);
    const criticalMarketPriceImpact = useMemo(() => priceImpactValues?.criticalMarketPriceImpact, [priceImpactValues]);
    useTransferBlocked(showCriticalMarketPriceImpactButtons ? 'critical_price_impact' : undefined,
        lifecycleContextFromSwap(swapBasicData, swapDetails), 'SendTransactionButton')

    const handleClick = async () => {
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

        try {
            const selectedWallet = wallets.find(w => w.id === selectedSourceAccount?.id)
            if (!selectedSourceAccount) {
                throw new Error('Selected source account is undefined')
            }
            if (!selectedWallet?.isActive) {
                throw new Error('Wallet is not active')
            }

            setLoading(true)
            setActionStateText(undefined)
            clearError?.()
            setSwapError?.("")

            // Every wallet request below needs the wallet on the source chain: wagmi refuses to
            // send on another chain and wallets reject typed-data domains for one.
            // Wallets often switch an already-approved chain without asking, within moments, so
            // the "confirm in your wallet" state only shows once a prompt is clearly open.
            let switchPrompt: ReturnType<typeof setTimeout> | undefined
            try {
                await ensureSourceChain({
                    wallet: selectedWallet,
                    network: swapBasicData.source_network,
                    switchChain: selectedSourceAccount.provider.switchChain,
                    context: lifecycleContextFromSwap(swapBasicData, swapDetails),
                    path: 'SendTransactionButton',
                    onLifecycle: onSwapLifecycle,
                    onSwitchStart: () => {
                        switchPrompt = setTimeout(() => {
                            setActionStateText("Switching network")
                            setNetworkSwitch({ isPending: true, isError: false, error: null })
                        }, SWITCH_PROMPT_DELAY_MS)
                    },
                })
            } finally {
                clearTimeout(switchPrompt)
                setNetworkSwitch(NO_NETWORK_SWITCH)
            }

            let swapData: SwapDetails | undefined = swapDetails
            let depositActions = depositActionsResponse;

            if (!swapId || !swapDetails) {
                setActionStateText("Preparing")
                setSwapId(undefined)

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

                setSwapId(newSwapId)

                const priceImpactValues = newSwapData.quote ? resolvePriceImpactValues(newSwapData.quote, newSwapData.refuel) : undefined;

                if (priceImpactValues?.criticalMarketPriceImpact) {
                    setShowCriticalMarketPriceImpactButtons(true)
                    return
                }

                if (isDiffByPercent(quote?.receive_amount, newSwapData.quote.receive_amount, 2)) {
                    setActionStateText("Updating quotes")
                    setQuoteLoading(true)
                    await sleep(3500)
                    setQuoteLoading(false)
                }
                swapData = newSwapData.swap
                depositActions = newSwapData.deposit_actions;
            }
            if (!depositActions?.length) {
                throw new Error('No deposit actions')
            }

            if (!swapData) {
                throw new Error('No swap data')
            }

            const executionContext: DepositExecutionContext = {
                swapData,
                depositActions,
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

            if (onSign && depositActions.some(isSignAction)) {
                await executeGaslessAuthorization(executionContext, onSign)
            } else {
                await executeWalletTransfer(executionContext, onClick)
            }
        }
        catch (e) {
            if (e instanceof NetworkSwitchError) {
                // Nothing was sent and any created swap is still valid: "Try again" only re-asks
                // the wallet to switch. The attempt is already reported through the lifecycle.
                setNetworkSwitch({ isPending: false, isError: true, error: e })
                return
            }
            setSwapId(undefined)
            const error = e as Error;
            const rejected = isUserRejection(e)
            if (!rejected) {
                ErrorHandler({
                    type: 'SwapWithdrawalError',
                    message: error.message,
                    name: error.name,
                    stack: error.stack,
                    cause: error,
                    swapId: swapId,
                    fromAddress: selectedSourceAccount?.address,
                    toAddress: swapBasicData?.destination_address
                });
            }

            const walletBalance = balances?.find(b => b?.network === swapBasicData.source_network?.name && b?.token === swapBasicData.source_token?.symbol)
            if (!rejected && walletBalance?.isNativeCurrency && gasData?.gas && walletBalance?.amount != null) {
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
            setLoading(false)
        }
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
        handleClick()
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
        handleClick()
    }

    if (quoteIsLoading || loading)
        return (<>
            {networkSwitch.isPending &&
                <ChangeNetworkMessage data={networkSwitch} network={swapBasicData.source_network.display_name} />}
            <ButtonWrapper
                {...props}
                isSubmitting={true}
                isDisabled={true}
            >
                {actionStateText || "Preparing"}
            </ButtonWrapper>
        </>)

    if (showCriticalMarketPriceImpactButtons) {
        return (<>
            {networkSwitch.isError ? (
                <ChangeNetworkMessage data={networkSwitch} network={swapBasicData.source_network.display_name} />
            ) : null}
            {quote && priceImpactValues && (
                <ErrorDisplay
                    icon={<InfoIcon className={ICON_CLASSES_WARNING} />}
                    title="Critical receiving amount"
                    message={`By continuing, you agree to receive as low as ${quote.min_receive_amount} ${quote.destination_token?.asset} ($ ${priceImpactValues.minReceiveAmountUSD})`}
                />
            )}
            <ButtonWrapper
                {...props}
                onClick={handleClick}
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
                onClick={() => {
                    onSwapLifecycle({
                        step: 'retry_requested',
                        stage: 'form',
                        outcome: 'started',
                        path: 'CriticalMarketPriceImpact',
                        reasonCode: 'select_another_route',
                        ...lifecycleContextFromSwap(swapBasicData, swapDetails),
                    })
                    onCancelWithdrawal?.()
                }}
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
            {!!(!swapId && criticalMarketPriceImpact && quote?.destination_token && priceImpactValues && !error) && (
                <ErrorDisplay
                    icon={<InfoIcon className={ICON_CLASSES_WARNING} />}
                    title="Critical receiving amount"
                    message={`The “receive at least” amount is affected by high price impact. You will receive at least ${quote.min_receive_amount} ${quote.destination_token.asset} ($ ${priceImpactValues.minReceiveAmountUSD})`}
                />
            )}
            {networkSwitch.isError &&
                <ChangeNetworkMessage data={networkSwitch} network={swapBasicData.source_network.display_name} />}
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
                    isDisabled={quoteIsLoading || !!quoteError}
                >
                    {(error || swapError || networkSwitch.isError) ? 'Try again' : actionButtonText || 'Swap now'}
                </ButtonWrapper>
            )}
        </>
    )
}
