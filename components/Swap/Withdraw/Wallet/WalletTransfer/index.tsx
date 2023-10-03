import { FC, useEffect, useState } from "react";
import {
    useAccount,
    useSwitchNetwork,
    useNetwork,
} from "wagmi";
import { PublishedSwapTransactions } from "../../../../../lib/layerSwapApiClient";
import TransferNativeTokenButton from "./TransferNativeToken";
import { ChangeNetworkButton, ConnectWalletButton } from "./buttons";
import TransferErc20Button from "./TransferErc20";
import { useSettingsState } from "../../../../../context/settings";
import { useWalletStore } from "../../WalletStore";
import { useSwapDataState } from "../../../../../context/swap";

type Props = {
    sequenceNumber: number,
    chainId: number,
    depositAddress: `0x${string}`,
    tokenContractAddress: `0x${string}`,
    userDestinationAddress: `0x${string}`,
    amount: number,
    tokenDecimals: number,
    networkDisplayName: string,
    swapId: string;
    asset: string;
}

const TransferFromWallet: FC<Props> = ({ networkDisplayName,
    chainId,
    depositAddress,
    userDestinationAddress,
    amount,
    tokenContractAddress,
    tokenDecimals,
    sequenceNumber,
    swapId,
    asset
}) => {
    const { isConnected, address } = useAccount();
    const networkChange = useSwitchNetwork({
        chainId: chainId,
    });
    const { layers } = useSettingsState()
    const { swap } = useSwapDataState()
    const { chain: activeChain } = useNetwork();

    const [savedTransactionHash, setSavedTransactionHash] = useState<string>()

    useEffect(() => {
        if (activeChain?.id === chainId)
            networkChange.reset()
    }, [activeChain, chainId])

    useEffect(() => {
        try {
            const data: PublishedSwapTransactions = JSON.parse(localStorage.getItem('swapTransactions') || "{}")
            const hash = data?.[swapId]?.hash
            if (hash)
                setSavedTransactionHash(hash)
        }
        catch (e) {
            //TODO log to logger
            console.error(e.message)
        }
    }, [swapId])

    const hexed_sequence_number = sequenceNumber?.toString(16)
    const sequence_number_even = hexed_sequence_number?.length % 2 > 0 ? `0${hexed_sequence_number}` : hexed_sequence_number

    const sourceLayer = layers?.find(l => l.internal_name === swap?.source_network)
    const networkAccount = useWalletStore((state) => state.networks[sourceLayer?.internal_name])
    const isSweeplessTx = address !== userDestinationAddress && networkAccount?.metadata?.isArgent !== true

    if (!isConnected) {
        return <ConnectWalletButton />
    }
    else if (activeChain?.id !== chainId) {
        return <ChangeNetworkButton
            chainId={chainId}
            network={networkDisplayName}
        />
    }
    else if (tokenContractAddress) {
        return <TransferErc20Button
            swapId={swapId}
            sequenceNumber={sequence_number_even}
            amount={amount}
            depositAddress={depositAddress}
            savedTransactionHash={savedTransactionHash as `0x${string}`}
            tokenContractAddress={tokenContractAddress}
            tokenDecimals={tokenDecimals}
            isSweeplessTx={isSweeplessTx}
        />
    }
    else {
        return <TransferNativeTokenButton
            swapId={swapId}
            sequenceNumber={sequence_number_even}
            amount={amount}
            depositAddress={depositAddress}
            savedTransactionHash={savedTransactionHash as `0x${string}`}
            chainId={chainId}
            isSweeplessTx={isSweeplessTx}
        />
    }
}

export default TransferFromWallet
