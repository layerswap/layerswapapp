import { FC, useCallback } from "react";
import { useSwitchChain } from "wagmi";
import WalletIcon from "../../../../icons/WalletIcon";
import SubmitButton, { SubmitButtonProps } from "../../../../buttons/submitButton";
import { useSwapDataState } from "../../../../../context/swap";
import { ActionData } from "../WalletTransfer/sharedTypes";
import ManualTransferNote from "../WalletTransfer/manualTransferNote";
import WalletMessage from "../../messages/Message";
import { SendTransactionButton } from "../WalletTransfer/buttons";

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
            <SendTransactionButton
                onClick={clickHandler}
                icon={<WalletIcon className="stroke-2 w-6 h-6" />}
                error={!!error}
            />
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
            source_network?.deposit_methods?.some(m => m === 'deposit_address') &&
            <ManualTransferNote />
        }
    </div>
}