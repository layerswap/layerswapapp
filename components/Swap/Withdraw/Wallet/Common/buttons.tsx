import { ComponentProps, FC, useCallback, useEffect, useMemo, useState } from "react";
import WalletIcon from "@/components/icons/WalletIcon";
import { ActionData, TransferProps } from "./sharedTypes";
import SubmitButton, { SubmitButtonProps } from "@/components/buttons/submitButton";
import useWallet from "@/components/../hooks/useWallet";
import { useSwapDataState, useSwapDataUpdate } from "@/context/swap";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import WalletMessage from "../../messages/Message";
import { useConnectModal } from "@/components/WalletModal";
import { Network, NetworkRoute } from "@/Models/Network";
import { useQueryState } from "@/context/query";
import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { useSwapTransactionStore, useGaslessAuthorizationStore } from "@/stores/swapTransactionStore";
import LayerSwapApiClient, { BackendTransactionStatus, DepositAction, SwapBasicData, SwapDetails } from "@/lib/apiClients/layerSwapApiClient";
import sleep from "@/lib/wallets/utils/sleep";
import { isDiffByPercent } from "@/components/utils/numbers";
import posthog from "posthog-js";
import { useWalletWithdrawalState } from "@/context/withdrawalContext";
import { useSelectedAccount } from "@/context/swapAccounts";
import { resolvePriceImpactValues } from "@/lib/fees";
import InfoIcon from "@/components/icons/InfoIcon";
import { useGoHome } from "@/hooks/useGoHome";
import KnownInternalNames from "@/lib/knownIds";
import { useSettingsState } from "@/context/settings";
import { useBalance } from "@/lib/balances/useBalance";
import useSWRGas from "@/lib/gases/useSWRGas";
export const ConnectWalletButton: FC<SubmitButtonProps> = ({ ...props }) => {
    const { swapBasicData } = useSwapDataState()
    const { source_network } = swapBasicData || {}
    const [loading, setLoading] = useState(false)
    const { provider } = useWallet(source_network, 'withdrawal')
    const { connect } = useConnectModal()

    const clickHandler = useCallback(async () => {
        try {
            setLoading(true)

            if (!provider) throw new Error(`No provider from ${source_network?.name}`)

            await connect(provider)
        }
        catch (e) {
            toast.error(e.message)
        }
        finally {
            setLoading(false)
        }
    }, [provider])

    return <ButtonWrapper
        onClick={props.onClick ?? clickHandler}
        icon={loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (props.icon ?? <WalletIcon className="stroke-2 w-6 h-6" />)}
        isDisabled={loading || props.isDisabled}
        isSubmitting={loading || props.isSubmitting}
        {...props}
    >
        Send from wallet
    </ButtonWrapper>
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
    onClick: (props: TransferProps) => Promise<string | undefined>
    // Gasless deposit: signs the `sign` deposit action's typed data and returns the
    // signature hex (eth_signTypedData_v4). Provided by EVM withdrawal only.
    onSign?: (signAction: DepositAction) => Promise<string>
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
    const query = useQueryState()
    const goHome = useGoHome()
    const { quote, quoteIsLoading, quoteError, swapId, swapDetails, depositActionsResponse, refuel: refuelData, setSwapError } = useSwapDataState()
    const { onWalletWithdrawalSuccess: onWalletWithdrawalSuccess, onCancelWithdrawal } = useWalletWithdrawalState();
    const { createSwap, setSwapId, setQuoteLoading } = useSwapDataUpdate()
    const { setSwapTransaction } = useSwapTransactionStore();
    const layerswapApiClient = new LayerSwapApiClient()
    const selectedSourceAccount = useSelectedAccount("from", swapBasicData.source_network?.name);
    const { wallets } = useWallet(swapBasicData.source_network, 'withdrawal')
    const { networks } = useSettingsState()
    const source_network = networks.find(n => n.name === swapBasicData.source_network?.name)
    const { balances } = useBalance(selectedSourceAccount?.address, source_network)
    const walletBalance = balances?.find(b => b?.network === source_network?.name && b?.token === swapBasicData.source_token?.symbol)
    const isNativeToken = swapBasicData.source_token?.symbol === source_network?.token?.symbol
    const { gasData } = useSWRGas(selectedSourceAccount?.address, source_network, swapBasicData.source_token, swapBasicData.requested_amount)

    const [actionStateText, setActionStateText] = useState<string | undefined>()
    const [loading, setLoading] = useState(false)
    const [showCriticalMarketPriceImpactButtons, setShowCriticalMarketPriceImpactButtons] = useState(false)

    const priceImpactValues = useMemo(() => quote ? resolvePriceImpactValues(quote, refuel ? refuelData : undefined) : undefined, [quote, refuel]);
    const criticalMarketPriceImpact = useMemo(() => priceImpactValues?.criticalMarketPriceImpact, [priceImpactValues]);

    // Gasless deposit: the source token signals EIP-3009 support and the EVM step
    // supplied a signer. Drives the "Sign" affordance and the post-create sign branch.
    const isGaslessCapable = !!onSign && !!swapBasicData.source_token?.supports_gasless_deposit

    const handleClick = async () => {
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

                const newSwapData = await createSwap(swapValues, query).catch((e: any) => {
                    setSwapError?.(e?.response?.data?.error?.message || e?.message || 'Could not create swap')
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

            // Gasless deposit: sign the EIP-3009 typed data and POST it to /authorize
            // instead of broadcasting a transaction. There is no user-side tx hash —
            // record an empty pending marker to leave the withdraw screen (mirrors the
            // Hyperliquid flow); the backend's input tx arrives once the paymaster
            // publishes the deposit.
            const signAction = depositActions.find(action => action.type === 'sign')
            if (signAction && onSign) {
                if (!selectedSourceAccount?.address) {
                    throw new Error('No selected account')
                }
                setActionStateText("Sign in wallet")
                let authorizedValidBefore: number | undefined
                try {
                    authorizedValidBefore = await submitGaslessAuthorization({
                        swapId: swapData.id,
                        signAction,
                        onSign,
                        sourceAddress: selectedSourceAccount.address,
                        layerswapApiClient,
                    })
                } catch (e: any) {
                    if (!isUserRejection(e)) {
                        setSwapError?.(e?.response?.data?.error?.message || e?.message || 'Could not authorize the gasless deposit')
                    }
                    throw e
                }
                setSwapTransaction(swapData.id, BackendTransactionStatus.Pending, '')
                // Record the signature deadline so the processing screen can surface a
                // "something went wrong, try again" state if the paymaster never publishes.
                if (authorizedValidBefore) {
                    useGaslessAuthorizationStore.getState().setGaslessAuthorization(swapData.id, authorizedValidBefore)
                }
                onWalletWithdrawalSuccess?.()
                return
            }

            const transferProps = resolveTransactionData(swapData, depositActions, swapBasicData.destination_address, swapBasicData.source_network);
            setActionStateText("Opening Wallet")
            const hash = await onClick(transferProps)
            if (hash) {
                onWalletWithdrawalSuccess?.();
                setSwapTransaction(swapData.id, BackendTransactionStatus.Pending, hash);
                try {
                    await layerswapApiClient.SwapCatchup(swapData.id, hash);
                } catch (e) {
                    posthog.captureException(e, {
                        $layerswap_exception_type: "Swap Catchup Error",
                        swapId: swapData.id,
                        transactionHash: hash,
                        $fromAddress: selectedSourceAccount?.address,
                        $toAddress: swapBasicData?.destination_address
                    });
                }
            }
        }
        catch (e) {
            setSwapId(undefined)

            posthog.captureException(e, {
                $layerswap_exception_type: "Swap Withdrawal Error",
                swapId: swapId,
                $fromAddress: selectedSourceAccount?.address,
                $toAddress: swapBasicData?.destination_address,
            });

            if (isNativeToken && gasData?.gas && walletBalance?.amount != null) {
                const requestedAmount = Number(swapBasicData.requested_amount)
                const difference = walletBalance.amount - requestedAmount
                if (difference >= 0 && difference < 5 * gasData.gas) {
                    posthog.capture('Possible Gas Fee Miscalculation', {
                        requestedAmount,
                        walletBalance: walletBalance.amount,
                        calculatedGas: gasData.gas,
                        difference,
                        network: swapBasicData.source_network?.name,
                        token: swapBasicData.source_token?.symbol,
                        errorMessage: (e as Error)?.message,
                        errorName: (e as Error)?.name,
                    })
                }
            }
        }
        finally {
            setLoading(false)
        }
    }

    if (quoteIsLoading || loading)
        return (
            <ButtonWrapper
                {...props}
                isSubmitting={true}
                isDisabled={true}
            >
                {actionStateText || "Preparing"}
            </ButtonWrapper>
        )

    if (showCriticalMarketPriceImpactButtons) {
        return (<>
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
                onClick={() => onCancelWithdrawal ? onCancelWithdrawal() : goHome()}
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
            <ButtonWrapper
                {...props}
                isSubmitting={props.isSubmitting || loading || quoteIsLoading}
                onClick={handleClick}
                isDisabled={quoteIsLoading || !!quoteError}
            >
                {error ? 'Try again' : (isGaslessCapable ? 'Sign & swap (no gas)' : 'Swap now')}
            </ButtonWrapper>
        </>
    )
}


const resolveTransactionData = (swapDetails: SwapDetails, deposit_actions: DepositAction[], destination_address: string, source_network: Network): TransferProps => {
    const depositAction = deposit_actions?.find(action =>
        action.type === 'transfer');
    if (!depositAction) {
        throw new Error('No deposit action found')
    }
    return {
        amount: depositAction.amount,
        callData: depositAction.call_data,
        depositAddress: depositAction.to_address,
        sequenceNumber: swapDetails.metadata.sequence_number,
        swapId: swapDetails.id,
        userDestinationAddress: destination_address
    }
}

const isUserRejection = (err: unknown): boolean => {
    if (err instanceof Error && /user rejected|user denied|rejected the request/i.test(err.message)) return true
    const code = (err as any)?.code ?? (err as any)?.cause?.code
    return code === 4001
}

// The unix-seconds expiry (validUntil) of a sign action's authorization.
const resolveGaslessValidBefore = (action: DepositAction): number | undefined => {
    if (typeof action.valid_before === 'number') return action.valid_before
    const fromTypedData = action.typed_data?.message?.validBefore
    const parsed = fromTypedData != null ? Number(fromTypedData) : NaN
    return Number.isFinite(parsed) ? parsed : undefined
}

// Sign the gasless ('sign') deposit action and submit the signature to /authorize.
// Returns the `valid_before` of the authorization that succeeded (so the caller can
// detect a paymaster timeout later). Handles the authorize responses from the
// integration doc §4:
//  - "already authorized" → treat as success (the deposit is already in flight).
//  - "expired" → the signature window (~30 min) lapsed; re-fetch a fresh sign action
//    (new valid_before/nonce), re-sign and re-authorize once.
//  - any other error → rethrow for the caller to surface.
const submitGaslessAuthorization = async (args: {
    swapId: string,
    signAction: DepositAction,
    onSign: (signAction: DepositAction) => Promise<string>,
    sourceAddress: string,
    layerswapApiClient: LayerSwapApiClient,
}): Promise<number | undefined> => {
    const { swapId, signAction, onSign, sourceAddress, layerswapApiClient } = args

    const authorize = async (action: DepositAction) => {
        const signature = await onSign(action)
        await layerswapApiClient.AuthorizeSwapAsync(swapId, signature)
    }

    try {
        await authorize(signAction)
        return resolveGaslessValidBefore(signAction)
    } catch (e: any) {
        const message: string = (e?.response?.data?.error?.message || e?.message || '').toLowerCase()
        if (message.includes('already') && message.includes('authoriz')) {
            return resolveGaslessValidBefore(signAction)
        }
        if (message.includes('expired')) {
            const refreshed = await layerswapApiClient.GetDepositActionsAsync(swapId, sourceAddress)
            const freshSignAction = refreshed?.data?.find(action => action.type === 'sign')
            if (!freshSignAction?.typed_data) {
                throw new Error('Could not refresh the gasless deposit authorization. Please try again.')
            }
            await authorize(freshSignAction)
            return resolveGaslessValidBefore(freshSignAction)
        }
        throw e
    }
}