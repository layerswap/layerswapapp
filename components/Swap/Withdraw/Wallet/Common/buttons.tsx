import { ComponentProps, FC, useCallback, useState } from "react";
import WalletIcon from "@/components/icons/WalletIcon";
import { ActionData, TransferProps } from "./sharedTypes";
import SubmitButton, { SubmitButtonProps } from "@/components/buttons/submitButton";
import useWallet from "@/components/../hooks/useWallet";
import { useSwapDataState, useSwapDataUpdate } from "@/context/swap";
import ManualTransferNote from "./manualTransferNote";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import WalletMessage from "../../messages/Message";
import { useConnectModal } from "@/components/WalletModal";
import { Network, NetworkRoute } from "@/Models/Network";
import { useQueryState } from "@/context/query";
import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { useRouter } from "next/router";

export const ConnectWalletButton: FC<SubmitButtonProps> = ({ ...props }) => {
    const { swapResponse } = useSwapDataState()
    const { swap } = swapResponse || {}
    const { source_network } = swap || {}
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
    const { provider } = useWallet(network, 'withdrawal')
    const [error, setError] = useState<Error | null>(null)
    const [isPending, setIsPending] = useState(false)

    const { selectedSourceAccount } = useSwapDataState()

    const clickHandler = useCallback(async () => {
        try {
            setIsPending(true)
            if (!provider) throw new Error(`No provider from ${network?.name}`)
            if (!provider.switchChain) throw new Error(`No switchChain from ${network?.name}`)
            if (!selectedSourceAccount?.wallet) throw new Error(`No selectedSourceAccount from ${network?.name}`)

            return await provider.switchChain(selectedSourceAccount?.wallet, chainId)
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
    const { swapResponse } = useSwapDataState()
    const { swap } = swapResponse || {}
    const { source_network } = swap || {}

    return <>
        <div className="flex flex-col text-primary-text text-base space-y-2">
            <SubmitButton
                text_align='center'
                buttonStyle='filled'
                size="medium"
                type="button"
                {...props}
            >
                {props.children}
            </SubmitButton>
        </div>
        {
            source_network?.deposit_methods?.some(m => m === 'deposit_address') &&
            <ManualTransferNote />
        }
    </>

}

type ButtonWrapperProps = ComponentProps<typeof ButtonWrapper>;
type SendFromWalletButtonProps = Omit<ButtonWrapperProps, 'onClick'> & {
    error?: boolean;
    onClick: (props: TransferProps) => Promise<void>
};

export const SendTransactionButton: FC<SendFromWalletButtonProps> = ({
    error,
    onClick,
    ...props
}) => {
    const [loading, setLoading] = useState(false)
    const { createSwap, setSwapId, setSwapPath } = useSwapDataUpdate()
    const { swapResponse } = useSwapDataState()
    const { swap } = swapResponse || {}
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
                amount: swap?.requested_amount.toString(),
                from: swap?.source_network as NetworkRoute,
                to: swap?.destination_network as NetworkRoute,
                fromAsset: swap?.source_token,
                toAsset: swap?.destination_token,
                refuel: !!swapResponse?.refuel,
                destination_address: swap?.destination_address,
                depositMethod: 'wallet',
            }

            const swapData = await createSwap(swapValues, query);
            const swapId = swapData?.swap?.id;
            if(!swapId) {
                throw new Error('Swap ID is undefined');
            }
            setSwapId(swapId)
            setSwapPath(swapId, router)

            const depositAction = swapData?.deposit_actions && swapData?.deposit_actions[0];

            const transferProps: TransferProps = {
                amount: swap?.requested_amount,
                callData: depositAction?.call_data,
                depositAddress: depositAction?.to_address,
                sequenceNumber: swap?.metadata.sequence_number,
                swapId: swapId,
                userDestinationAddress: swap?.destination_address
            }

            await onClick(transferProps)
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
        isSubmitting={props.isSubmitting || loading}
        onClick={handleClick}
    >
        {error ? 'Try again' : 'Send from wallet'}
    </ButtonWrapper>
}
