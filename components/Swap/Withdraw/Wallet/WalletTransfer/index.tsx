import { FC, useEffect, useState } from "react";
import {
    useAccount,
    useSwitchNetwork,
    useNetwork,
} from "wagmi";
import LayerSwapApiClient, { DepositAddress, PublishedSwapTransactions } from "../../../../../lib/layerSwapApiClient";
import TransferNativeTokenButton from "./TransferNativeToken";
import { ChangeNetworkButton, ConnectWalletButton } from "./buttons";
import TransferErc20Button from "./TransferErc20";
import KnownInternalNames from "../../../../../lib/knownIds";
import { useSwapDataState } from "../../../../../context/swap";
import { useSettingsState } from "../../../../../context/settings";
import isArgentWallet from "../../../../../lib/isArgentWallet";
import useSWR from "swr";
import { ApiResponse } from "../../../../../Models/ApiResponse";

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
    const { swap } = useSwapDataState()
    const { networks } = useSettingsState()

    const { chain: activeChain } = useNetwork();
    const [isArgent, setIsArgent] = useState<boolean>(false)

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

    useEffect(() => {
        const source_network = networks?.find(n => n.internal_name === swap?.source_network)

        if (source_network?.internal_name === KnownInternalNames.Networks.EthereumMainnet && address) {
            (async () => {
                setIsArgent(await isArgentWallet(address, source_network))
            })()
        }
        else {
            setIsArgent(false)
        }
    }, [swap?.source_network, address])

    const generateDepositParams = isArgent ? [swap?.source_network] : null

    const layerswapApiClient = new LayerSwapApiClient()
    const {
        data: generatedDeposit
    } = useSWR<ApiResponse<DepositAddress>>(generateDepositParams, ([network]) => layerswapApiClient.GenerateDepositAddress(network), { dedupingInterval: 60000 })

    const hexed_sequence_number = sequenceNumber?.toString(16)
    const sequence_number_even = !isArgent ? (hexed_sequence_number?.length % 2 > 0 ? `0${hexed_sequence_number}` : hexed_sequence_number) : ''

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
            depositAddress={(generatedDeposit?.data?.address as `0x${string}`) || depositAddress}
            userDestinationAddress={userDestinationAddress}
            savedTransactionHash={savedTransactionHash as `0x${string}`}
            tokenContractAddress={tokenContractAddress}
            tokenDecimals={tokenDecimals}
        />
    }
    else {
        return <TransferNativeTokenButton
            swapId={swapId}
            sequenceNumber={sequence_number_even}
            amount={amount}
            depositAddress={(generatedDeposit?.data?.address as `0x${string}`) || depositAddress}
            userDestinationAddress={userDestinationAddress}
            savedTransactionHash={savedTransactionHash as `0x${string}`}
            chainId={chainId}
        />
    }
}

export default TransferFromWallet
