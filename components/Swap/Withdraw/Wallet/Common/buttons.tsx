import { ComponentProps, FC, useCallback, useMemo, useState } from "react";
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
import { useSwapTransactionStore } from "@/stores/swapTransactionStore";
import { BackendTransactionStatus, SwapBasicData } from "@/lib/apiClients/layerSwapApiClient";
import sleep from "@/lib/wallets/utils/sleep";
import { isDiffByPercent } from "@/components/utils/numbers";
import posthog from "posthog-js";
import { useWalletWithdrawalState } from "@/context/withdrawalContext";
import { useSelectedAccount } from "@/context/balanceAccounts";

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
    onClick: (props: TransferProps) => Promise<string | undefined>
    swapData: SwapBasicData,
    refuel: boolean
};

export const SendTransactionButton: FC<SendFromWalletButtonProps> = ({
    error,
    onClick,
    swapData,
    refuel,
    ...props
}) => {
    const [actionStateText, setActionStateText] = useState<string | undefined>()
    const [loading, setLoading] = useState(false)
    const { quote, quoteIsLoading } = useSwapDataState()
    const { createSwap, setSwapId, setQuoteLoading } = useSwapDataUpdate()
    const { setSwapTransaction } = useSwapTransactionStore();
    const query = useQueryState()

    const { onWalletWithdrawalSuccess: onWalletWithdrawalSuccess } = useWalletWithdrawalState();

    const selectedSourceAccount = useSelectedAccount("from", swapData.source_network?.name);
    const { wallets } = useWallet(swapData.source_network, 'withdrawal')

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
            setActionStateText("Preparing")
            setSwapId(undefined)

            const swapValues: SwapFormValues = {
                amount: swapData.requested_amount.toString(),
                from: swapData.source_network as NetworkRoute,
                to: swapData.destination_network as NetworkRoute,
                fromAsset: swapData.source_token,
                toAsset: swapData.destination_token,
                refuel: refuel,
                destination_address: swapData.destination_address,
                depositMethod: 'wallet',
            }

            const newSwapData = await createSwap(swapValues, query);
            const swapId = newSwapData?.swap?.id;
            if (!swapId) {
                throw new Error('Swap ID is undefined');
            }

            if (isDiffByPercent(quote?.receive_amount, newSwapData.quote.receive_amount, 2)) {
                setActionStateText("Updating quotes")
                setQuoteLoading(true)
                await sleep(3500)
                setQuoteLoading(false)
            }
            setActionStateText("Opening Wallet")
            setSwapId(swapId)
            const depositAction = newSwapData?.deposit_actions && newSwapData?.deposit_actions[0];

            const transferProps: TransferProps = {
                amount: depositAction?.amount,
                callData: depositAction?.call_data,
                depositAddress: depositAction?.to_address,
                sequenceNumber: newSwapData.swap?.metadata.sequence_number,
                swapId: swapId,
                userDestinationAddress: newSwapData.swap?.destination_address
            }
            const hash = await onClick(transferProps)
            if (hash) {
                onWalletWithdrawalSuccess?.();
                setSwapTransaction(swapId, BackendTransactionStatus.Pending, hash);
            }
        }
        catch (e) {
            setSwapId(undefined)
            console.log('Error in SendTransactionButton:', e)

            const swapWithdrawalError = new Error(e);
            swapWithdrawalError.name = `SwapWithdrawalError`;
            swapWithdrawalError.cause = e;
            posthog.capture('$exception', {
                name: swapWithdrawalError.name,
                cause: swapWithdrawalError.cause,
                message: swapWithdrawalError.message,
                stack: swapWithdrawalError.stack,
                where: 'TransactionError',
                severity: 'error',
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

    return (
        <ButtonWrapper
            {...props}
            isSubmitting={props.isSubmitting || loading || quoteIsLoading}
            onClick={handleClick}
            isDisabled={quoteIsLoading}
        >
            {error ? 'Try again' : 'Send from wallet'}
        </ButtonWrapper>
    )
}
