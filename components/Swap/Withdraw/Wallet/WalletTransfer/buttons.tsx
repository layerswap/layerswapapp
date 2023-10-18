import { useConnectModal } from "@rainbow-me/rainbowkit";
import { FC, ReactNode, useCallback } from "react";
import {
    useSwitchNetwork,
} from "wagmi";
import WalletIcon from "../../../../icons/WalletIcon";
import WalletMessage from "./message";
import { ActionData } from "./sharedTypes";
import SubmitButton from "../../../../buttons/submitButton";
import useWallet from "../../../../../hooks/useWallet";
import { useSwapDataState } from "../../../../../context/swap";
import { useSettingsState } from "../../../../../context/settings";
import { Layer } from "../../../../../Models/Layer";
import { NetworkType } from "../../../../../Models/CryptoNetwork";

export const ConnectWalletButton: FC = () => {
    const { swap } = useSwapDataState()
    const { layers } = useSettingsState()
    const { connectWallet } = useWallet()
    const source_layer = layers.find(l => l.internal_name === swap?.source_network)

    const clickHandler = useCallback(() => {
        return connectWallet(source_layer as Layer & { isExchange: false, type: NetworkType.EVM })
    }, [connectWallet])

    return <ButtonWrapper
        clcikHandler={clickHandler}
        icon={<WalletIcon className="stroke-2 w-6 h-6" />}
    >
        Connect wallet
    </ButtonWrapper>
}

export const ChangeNetworkMessage: FC<{ data: ActionData, network: string }> = ({ data, network }) => {
    if (data.isLoading) {
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

    const networkChange = useSwitchNetwork({
        chainId: chainId,
    });

    const clickHandler = useCallback(() => {
        return networkChange?.switchNetwork()
    }, [networkChange])

    return <>
        {
            <ChangeNetworkMessage
                data={networkChange}
                network={network}
            />
        }
        {
            !networkChange.isLoading &&
            <ButtonWrapper
                clcikHandler={clickHandler}
                icon={<WalletIcon className="stroke-2 w-6 h-6" />}
            >
                {
                    networkChange.isError ? <span>Try again</span>
                        : <span>Send from wallet</span>
                }
            </ButtonWrapper>
        }
    </>
}

type ButtonWrapperProps = {
    icon?: ReactNode,
    clcikHandler: () => void,
    disabled?: boolean,
    children: ReactNode
}
export const ButtonWrapper: FC<ButtonWrapperProps> = ({
    icon,
    clcikHandler,
    disabled,
    children
}) => {
    return <div>
        <div className="flex flex-row text-primary-text text-base space-x-2">
            <SubmitButton icon={icon}
                text_align='center'
                isDisabled={disabled}
                isSubmitting={false}
                onClick={clcikHandler}
                buttonStyle='filled'
                size="medium">
                {children}
            </SubmitButton>
        </div>
    </div>
}