import { Plus, RefreshCw, WalletIcon } from "lucide-react";
import { FC, useCallback, useMemo, useState } from "react";
import useWallet, { WalletProvider } from "../../../hooks/useWallet";
import { Wallet } from "../../../stores/walletStore";
import { Network, NetworkWithTokens } from "../../../Models/Network";
import { AddressGroup } from "../../Input/Address/AddressPicker";
import AddressWithIcon from "../../Input/Address/AddressPicker/AddressWithIcon";
import { addressFormat } from "../../../lib/address/formatter";
import FilledCheck from "../../icons/FilledCheck";
import { ResolveConnectorIcon } from "../../icons/ConnectorIcons";
import toast from "react-hot-toast";
import SubmitButton, { SubmitButtonProps } from "../../buttons/submitButton";
import { ActionData } from "../Withdraw/Wallet/WalletTransfer/sharedTypes";
import WalletMessage from "../Withdraw/Wallet/WalletTransfer/message";
import { useSwitchChain } from "wagmi";
import { useSwapDataState } from "../../../context/swap";

type ConnectProps = SubmitButtonProps & {
    network: Network;
    defaultText: string;
}

// TODO implement hifgher order component for different wallet providers
export const ConnectWalletButton: FC<ConnectProps> = (props) => {
    const { network, defaultText } = props
    const [loading, setLoading] = useState(false)

    const { getWithdrawalProvider: getProvider } = useWallet()
    const provider = useMemo(() => {
        return network && getProvider(network)
    }, [network, getProvider])

    const clickHandler = useCallback(async () => {
        try {
            setLoading(true)

            if (!provider) throw new Error(`No provider from ${network?.name}`)

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
        {defaultText}
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
    network: string,
    defaultText: string
}
export const ChangeNetworkButton: FC<ChangeNetworkProps> = (props) => {
    const { chainId, network, defaultText } = props
    const { switchChain, error, isPending, isError } = useSwitchChain();
    //TODO implement change network for useWallet providers
    const clickHandler = useCallback(() => {
        return switchChain({ chainId: Number(chainId) })
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
                        : <span>{defaultText}</span>
                }
            </ButtonWrapper>
        }
    </>
}

export const ButtonWrapper: FC<SubmitButtonProps> = ({
    ...props
}) => {
    return <div className="flex flex-col text-primary-text text-base space-y-2">
        <SubmitButton
            text_align='center'
            buttonStyle='filled'
            size="medium"
            {...props}
        >
            {props.children}
        </SubmitButton>
    </div>
}

type LockButtonProps = {
    isConnected: boolean,
    networkChainId: number | string,
    network: NetworkWithTokens,
    activeChain: any,
    onClick: () => Promise<void>,
    children: JSX.Element | JSX.Element[] | string | undefined
}

export const WalletActionButton: FC<LockButtonProps> = (props) => {
    const { isConnected, networkChainId, network, activeChain, onClick, children } = props;
    const [isPending, setIsPending] = useState(false)

    const handleClick = async () => {
        setIsPending(true)
        try {
            await onClick()
        }
        catch (e) {
            toast.error(e.message)
        }
        setIsPending(false)
    }

    if (!isConnected) {
        return <ConnectWalletButton
            defaultText="Connect wallet"
            network={network}
        />
    }

    if (activeChain != networkChainId && network) {
        return <ChangeNetworkButton
            chainId={networkChainId}
            network={network.display_name}
            defaultText="Change network"
        />
    }
    return <SubmitButton
        onClick={handleClick}
        isDisabled={isPending}
        isSubmitting={isPending}
    >
        {children}
    </SubmitButton>

}
