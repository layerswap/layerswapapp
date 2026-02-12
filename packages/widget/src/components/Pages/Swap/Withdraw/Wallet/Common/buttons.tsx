import { ComponentProps, FC, useCallback, useMemo, useState } from "react";
import WalletIcon from "@/components/Icons/WalletIcon";
import { ActionData } from "./sharedTypes";
import SubmitButton, { SubmitButtonProps } from "@/components/Buttons/submitButton";
import useWallet from "@/hooks/useWallet";
import { useSwapDataState, useSwapDataUpdate } from "@/context/swap";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import WalletMessage from "../../messages/Message";
import { useConnectModal } from "@/components/Wallet/WalletModal";
import { Network, NetworkRoute } from "@/Models/Network";
import { useInitialSettings, useSettingsState } from "@/context/settings";
import { useSwapTransactionStore } from "@/stores/swapTransactionStore";
import LayerSwapApiClient, { BackendTransactionStatus, DepositAction, SwapBasicData, SwapDetails } from "@/lib/apiClients/layerSwapApiClient";
import sleep from "@/lib/wallets/utils/sleep";
import { isDiffByPercent } from "@/components/utils/numbers";
import { useWalletWithdrawalState } from "@/context/withdrawalContext";
import { useSelectedAccount } from "@/context/swapAccounts";
import { SwapFormValues } from "../../../Form/SwapFormValues";
import { ErrorHandler } from "@/lib/ErrorHandler";
import { TokenBalance, TransferProps, Wallet } from "@/types";
import { resolvePriceImpactValues } from "@/lib/fees";
import InfoIcon from "@/components/Icons/InfoIcon";
import { useBalance } from "@/lib/balances/useBalance";
import KnownInternalNames from "@/lib/knownIds";

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
        className="text-primary-text text-base"
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
    swapData: SwapBasicData,
    refuel: boolean
};

export const SendTransactionButton: FC<SendFromWalletButtonProps> = ({
    error,
    clearError,
    onClick,
    swapData: swapBasicData,
    refuel,
    ...props
}) => {
    const { quote, quoteIsLoading, quoteError, swapId, swapDetails, depositActionsResponse, refuel: refuelData } = useSwapDataState()
    const { onWalletWithdrawalSuccess: onWalletWithdrawalSuccess, onCancelWithdrawal } = useWalletWithdrawalState();
    const { createSwap, setSwapId, setQuoteLoading } = useSwapDataUpdate()
    const { setSwapTransaction } = useSwapTransactionStore();
    const initialSettings = useInitialSettings()


    const layerswapApiClient = new LayerSwapApiClient()
    const selectedSourceAccount = useSelectedAccount("from", swapBasicData.source_network?.name);

    const { networks } = useSettingsState()
    const networkWithTokens = swapBasicData.source_network && networks.find(n => n.name === swapBasicData.source_network?.name)
    const { balances } = useBalance(selectedSourceAccount?.address, networkWithTokens)

    const { wallets } = useWallet(swapBasicData.source_network, 'withdrawal')
    const [actionStateText, setActionStateText] = useState<string | undefined>()
    const [loading, setLoading] = useState(false)
    const [showCriticalMarketPriceImpactButtons, setShowCriticalMarketPriceImpactButtons] = useState(false)

    const priceImpactValues = useMemo(() => quote ? resolvePriceImpactValues(quote, refuel ? refuelData : undefined) : undefined, [quote, refuel]);
    const criticalMarketPriceImpact = useMemo(() => priceImpactValues?.criticalMarketPriceImpact, [priceImpactValues]);

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

                const newSwapData = await createSwap(swapValues, initialSettings);
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

            const transferProps = resolveTransactionData(swapData, swapBasicData, depositActions, balances, selectedWallet);
            setActionStateText("Opening Wallet")
            const hash = await onClick(transferProps)
            if (hash) {
                onWalletWithdrawalSuccess?.();
                setSwapTransaction(swapData.id, BackendTransactionStatus.Pending, hash);
                try {
                    await layerswapApiClient.SwapCatchup(swapData.id, hash);
                } catch (e) {
                    console.error('Error in SwapCatchup:', e)
                    const swapWithdrawalError = new Error(e);
                    swapWithdrawalError.name = `SwapCatchupError`;
                    swapWithdrawalError.cause = e;
                    ErrorHandler({
                        type: 'SwapWithdrawalError',
                        message: swapWithdrawalError.message,
                        name: swapWithdrawalError.name,
                        stack: swapWithdrawalError.stack,
                        cause: swapWithdrawalError.cause,
                        swapId: swapData.id,
                        transactionHash: hash,
                        fromAddress: selectedSourceAccount?.address,
                        toAddress: swapBasicData?.destination_address
                    });
                }
            }
        }
        catch (e) {
            setSwapId(undefined)
            const error = e as Error;
            ErrorHandler({
                type: 'SwapWithdrawalError',
                message: error.message,
                name: error.name,
                stack: error.stack,
                cause: error.cause,
                swapId: swapId,
                fromAddress: selectedSourceAccount?.address,
                toAddress: swapBasicData?.destination_address
            });
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
                        <p className="text-primary-text font-semibold leading-4 text-base mt-0.5">Critical receiving amount</p>
                        <p className="text-priamry-text text-base font-normal leading-[18px]"><span>By continuing, you agree to receive as low as </span><span className="text-warning-foreground text-nowrap">{quote.min_receive_amount} {quote.destination_token?.symbol} ($ {priceImpactValues.minReceiveAmountUSD})</span></p>
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
                        <p className="text-secondary-text text-sm leading-[18px]"><span>The “receive at least” amount is affected by high price impact. You will receive at least </span><span>{quote.min_receive_amount} {quote.destination_token?.symbol} ($ {priceImpactValues.minReceiveAmountUSD}) </span></p>
                    </div>
                </div>
            </div>}
            <ButtonWrapper
                {...props}
                isSubmitting={props.isSubmitting || loading || quoteIsLoading}
                onClick={handleClick}
                isDisabled={quoteIsLoading || !!quoteError}
            >
                {error ? 'Try again' : 'Swap now'}
            </ButtonWrapper>
        </>
    )
}


const resolveTransactionData = (swapDetails: SwapDetails, swapBasicData: SwapBasicData, deposit_actions: DepositAction[], balances: TokenBalance[] | null | undefined, selectedWallet: Wallet): TransferProps => {
    const depositAction = deposit_actions?.find(action =>
        action.type === 'transfer'
        || ExceptionNetworks.includes(swapBasicData.source_network?.name) && action.type === 'manual_transfer');
    if (!depositAction) {
        throw new Error('No deposit action found')
    }
    return {
        amount: depositAction.amount,
        callData: depositAction.call_data,
        depositAddress: depositAction.to_address,
        sequenceNumber: swapDetails.metadata.sequence_number,
        swapId: swapDetails.id,
        userDestinationAddress: swapBasicData.destination_address,
        balances: balances,
        network: swapBasicData.source_network,
        token: swapBasicData.source_token,
        selectedWallet: selectedWallet,
    }
}

const ExceptionNetworks = [
    KnownInternalNames.Networks.ImmutableXMainnet,
    KnownInternalNames.Networks.ImmutableXSepolia
]