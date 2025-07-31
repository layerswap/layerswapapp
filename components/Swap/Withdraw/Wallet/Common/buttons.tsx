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
import { useRouter } from "next/router";
import { useSwapTransactionStore } from "@/stores/swapTransactionStore";
import { BackendTransactionStatus, SwapBasicData } from "@/lib/apiClients/layerSwapApiClient";
import { transformSwapDataToQuoteArgs, useQuoteData } from "@/hooks/useFee";

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

    const { provider } = useWallet(network, "withdrawal")
    const selectedSourceAccount = useMemo(() => provider?.activeWallet, [provider]);

    const clickHandler = useCallback(async () => {
        try {
            setIsPending(true)
            if (!provider) throw new Error(`No provider from ${network?.name}`)
            if (!provider.switchChain) throw new Error(`No switchChain from ${network?.name}`)
            if (!selectedSourceAccount) throw new Error(`No selectedSourceAccount from ${network?.name}`)

            return await provider.switchChain(selectedSourceAccount, chainId)
        } catch (e) {
            setError(e)
        } finally {
            setIsPending(false)
        }

    }, [provider, chainId])

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
    const [loading, setLoading] = useState(false)
    const { createSwap, setSwapId } = useSwapDataUpdate()
    const { setSwapTransaction } = useSwapTransactionStore();

    const quoteArgs = useMemo(() => transformSwapDataToQuoteArgs(swapData, refuel), [swapData, refuel]);
    const { isQuoteLoading } = useQuoteData(quoteArgs);

    const router = useRouter()
    const query = useQueryState()

    const handleClick = async () => {

        try {
            setSwapId(undefined)
            setLoading(true)
            window.safary?.track({
                eventName: 'click',
                eventType: 'send_from_wallet',
            })

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

            const _swapData = await createSwap(swapValues, query);
            const swapId = _swapData?.swap?.id;
            if (!swapId) {
                throw new Error('Swap ID is undefined');
            }

            const depositAction = _swapData?.deposit_actions && _swapData?.deposit_actions[0];

            const transferProps: TransferProps = {
                amount: depositAction?.amount,
                callData: depositAction?.call_data,
                depositAddress: depositAction?.to_address,
                sequenceNumber: _swapData.swap?.metadata.sequence_number,
                swapId: swapId,
                userDestinationAddress: _swapData.swap?.destination_address
            }

            const hash = await onClick(transferProps)

            if (hash) {
                setSwapTransaction(swapId, BackendTransactionStatus.Pending, hash);
                setSwapId(swapId)
            }

        }
        catch (e) {
            console.log('Error in SendTransactionButton:', e)
            throw new Error(e)
        }
        finally {
            setLoading(false)
        }

    }

    return <ButtonWrapper
        {...props}
        isSubmitting={props.isSubmitting || loading || isQuoteLoading}
        onClick={handleClick}
    >
        {error ? 'Try again' : 'Send from wallet'}
    </ButtonWrapper>
}
