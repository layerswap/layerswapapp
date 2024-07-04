import { FC, useCallback, useMemo, useState } from "react";
import { useSwitchChain } from "wagmi";
import WalletIcon from "../../../../icons/WalletIcon";
import SubmitButton, { SubmitButtonProps } from "../../../../buttons/submitButton";
import useWallet from "../../../../../hooks/useWallet";
import { useSwapDataState } from "../../../../../context/swap";
import toast from "react-hot-toast";
import WalletMessage from "../WalletTransfer/message";
import { ActionData } from "../WalletTransfer/sharedTypes";
import ManualTransferNote from "../WalletTransfer/manualTransferNote";
import { NetworkWithTokens } from "../../../../../Models/Network";

type ConnectProps = {
    network: NetworkWithTokens | undefined,
    text: string,
    icon: React.ReactNode,
    onClick?: () => void,
    isButton: boolean,
    onConnect?: () => void
}


export const ConnectWalletButton: FC<ConnectProps> = ({ network, text, icon, onClick, isButton, onConnect }) => {
    const [loading, setLoading] = useState(false)

    const { getWithdrawalProvider: getProvider } = useWallet()

    const provider = useMemo(() => {
        return network && getProvider(network)
    }, [network, getProvider])

    const clickHandler = useCallback(async () => {
        try {
            setLoading(true)
            onClick && onClick()
            if (!provider) throw new Error(`No provider from ${network?.name}`)

            await provider.connectWallet(provider?.name)
            onConnect && onConnect()
        }
        catch (e) {
            toast.error(e.message)
        }
        finally {
            setLoading(false)
        }

    }, [provider, onClick])

    return <ButtonWrapper
        buttonStyle="outline"
        className={isButton ? "w-full relative items-center justify-between gap-2 flex rounded-md outline-none bg-secondary-700 text-primary-text p-3 border border-secondary-500 font-normal"
            : "flex items-center justify-between gap-2 cursor-pointer rounded-md outline-none border-none text-primary-text p-3 font-light"}
        onClick={clickHandler}
        icon={icon}
    >
        {text}
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

export const ChangeNetworkButton: FC<{ chainId: number, network: string }> = ({ chainId, network }) => {
    const { switchChain, error, isPending, isError } = useSwitchChain();

    const clickHandler = useCallback(() => {
        return switchChain({ chainId })
    }, [switchChain, chainId])

    return <>
        {
            <ChangeNetworkMessage
                data={{
                    isPending: isPending,
                    isError: isError,
                    error
                }}
                network={network}
            />
        }
        {
            !isPending &&
            <ButtonWrapper
                onClick={clickHandler}
                icon={<WalletIcon className="stroke-2 w-6 h-6" />}
            >
                {
                    error ? <span>Try again</span>
                        : <span>Send from wallet</span>
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

    return <div className="flex flex-col text-primary-text text-base space-y-2">
        <SubmitButton
            text_align='center'
            buttonStyle='filled'
            size="medium"
            {...props}
        >
            {props.children}
        </SubmitButton>
        {
            source_network?.deposit_methods.some(m => m === 'deposit_address') &&
            <ManualTransferNote />
        }
    </div>
}