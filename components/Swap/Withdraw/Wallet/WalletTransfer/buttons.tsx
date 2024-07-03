import { FC, useCallback, useMemo, useState } from "react";
import { useSwitchChain } from "wagmi";
import WalletIcon from "../../../../icons/WalletIcon";
import WalletMessage from "./message";
import { ActionData } from "./sharedTypes";
import SubmitButton, { SubmitButtonProps } from "../../../../buttons/submitButton";
import useWallet from "../../../../../hooks/useWallet";
import { useSwapDataState } from "../../../../../context/swap";
import ManualTransferNote from "./manualTransferNote";
import toast from "react-hot-toast";

export const ConnectWalletButton: FC<SubmitButtonProps> = ({ ...props }) => {
    const { swapResponse } = useSwapDataState()
    const { swap } = swapResponse || {}
    const { source_network } = swap || {}
    const [loading, setLoading] = useState(false)

    const { getWithdrawalProvider: getProvider } = useWallet()
    const provider = useMemo(() => {
        return source_network && getProvider(source_network)
    }, [source_network, getProvider])

    const clickHandler = useCallback(async () => {
        try {
            setLoading(true)

            if (!provider) throw new Error(`No provider from ${source_network?.name}`)

            await provider.connectWallet(provider?.name)
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
        icon={props.icon ?? <WalletIcon className="stroke-2 w-6 h-6" />}
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