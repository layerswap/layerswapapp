import { ComponentProps, FC, useCallback, useState } from "react";
import { useSwitchChain } from "wagmi";
import WalletIcon from "../../../../icons/WalletIcon";
import { ActionData } from "./sharedTypes";
import SubmitButton, { SubmitButtonProps } from "../../../../buttons/submitButton";
import useWallet from "../../../../../hooks/useWallet";
import { useSwapDataState } from "../../../../../context/swap";
import ManualTransferNote from "./manualTransferNote";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import WalletMessage from "../../messages/Message";
import { useConnectModal } from "../../../../WalletModal";
import { Network } from "@/Models/Network";

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
type SendFromWalletButtonProps = ButtonWrapperProps & {
    error?: boolean;
};

export const SendTransactionButton: FC<SendFromWalletButtonProps> = ({
    ...props
}) => {

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        window.safary?.track({
            eventName: 'click',
            eventType: 'send_from_wallet',
        })
        props.onClick && props.onClick(e)
    }

    return <ButtonWrapper
        onClick={handleClick}
        {...props}>
        {props.error ? 'Try again' : 'Send from wallet'}
    </ButtonWrapper>
}
