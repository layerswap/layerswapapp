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
import { createPublicClient, http, parseAbi } from "viem";
import resolveChain from "../../../../../lib/resolveChain";
import { useSettingsState } from "../../../../../context/settings";
import KnownInternalNames from "../../../../../lib/knownIds";
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
    const { isConnected } = useAccount();
    const networkChange = useSwitchNetwork({
        chainId: chainId,
    });
    const { networks } = useSettingsState()
    const { swap } = useSwapDataState()

    const { chain: activeChain } = useNetwork();

    const { address } = useAccount();
    const [isSweeplessTx, setIsSweeplessTx] = useState<boolean>()
    const [savedTransactionHash, setSavedTransactionHash] = useState<string>()

    useEffect(() => {
        (async () => {
            if (swap.source_network === KnownInternalNames.Networks.EthereumMainnet) {
                const is = await isArgentWallet()
                setIsSweeplessTx(address !== userDestinationAddress && !is)
            }
            else setIsSweeplessTx(address !== userDestinationAddress)
        })()
    }, [address, swap, userDestinationAddress])

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

    const publicClient = createPublicClient({
        chain: resolveChain(networks.find(n => n.internal_name === swap?.source_network)),
        transport: http()
    })

    const isArgentWallet = async () => {
        const walletDetectorAddress = "0xeca4B0bDBf7c55E9b7925919d03CbF8Dc82537E8";
        const walletDetectorABI = parseAbi([
            "function isArgentWallet(address _wallet) external view returns (bool)"
        ]);
        const data = await publicClient.readContract({
            address: walletDetectorAddress,
            abi: walletDetectorABI,
            functionName: 'isArgentWallet',
            args: [address]
        })
        return data
    }

    const hexed_sequence_number = sequenceNumber?.toString(16)
    const sequence_number_even = hexed_sequence_number?.length % 2 > 0 ? `0${hexed_sequence_number}` : hexed_sequence_number


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
            isSweeplessTx={isSweeplessTx}
            amount={amount}
            depositAddress={depositAddress}
            savedTransactionHash={savedTransactionHash as `0x${string}`}
            tokenContractAddress={tokenContractAddress}
            tokenDecimals={tokenDecimals}
        />
    }
    else {
        return <TransferNativeTokenButton
            swapId={swapId}
            sequenceNumber={sequence_number_even}
            isSweeplessTx={isSweeplessTx}
            amount={amount}
            depositAddress={depositAddress}
            savedTransactionHash={savedTransactionHash as `0x${string}`}
            chainId={chainId}
        />
    }
}

export default TransferFromWallet
