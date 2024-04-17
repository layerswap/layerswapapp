import { FC, useEffect, useState } from "react";
import {
    useAccount,
    useSwitchNetwork,
    useNetwork,
} from "wagmi";
import { PublishedSwapTransactions } from "../../../../../lib/layerSwapApiClient";
import { ChangeNetworkButton, ConnectWalletButton } from "./buttons";
import TransferTokenButton from "./TransferToken";
import { WithdrawPageProps } from "../WalletTransferContent";

const TransferFromWallet: FC<WithdrawPageProps> = ({
    network,
    depositAddress,
    userDestinationAddress,
    amount,
    sequenceNumber,
    swapId,
}) => {


    const { isConnected } = useAccount();
    const chainId = Number(network?.chain_id) ?? undefined
    const networkChange = useSwitchNetwork({
        chainId: chainId,
    });

    const { chain: activeChain } = useNetwork();

    const [savedTransactionHash, setSavedTransactionHash] = useState<string>()

    useEffect(() => {
        if (activeChain?.id === chainId)
            networkChange.reset()
    }, [activeChain, chainId])

    useEffect(() => {
        try {
            const data: PublishedSwapTransactions = JSON.parse(localStorage.getItem('swapTransactions') || "{}")
            const hash = data?.[swapId!]?.hash
            if (hash)
                setSavedTransactionHash(hash)
        }
        catch (e) {
            //TODO log to logger
            console.error(e.message)
        }
    }, [swapId])
    if (!swapId || !sequenceNumber) return

    const hexed_sequence_number = sequenceNumber?.toString(16)
    const sequence_number_even = (hexed_sequence_number?.length % 2 > 0 ? `0${hexed_sequence_number}` : hexed_sequence_number)

    if (!isConnected) {
        return <ConnectWalletButton />
    }
    else if (activeChain?.id !== chainId && network) {
        return <ChangeNetworkButton
            chainId={chainId}
            network={network.display_name}
        />
    }
    else {
        return <TransferTokenButton
            swapId={swapId}
            sequenceNumber={sequence_number_even}
            amount={amount}
            depositAddress={depositAddress as `0x${string}`}
            userDestinationAddress={userDestinationAddress as `0x${string}`}
            savedTransactionHash={savedTransactionHash as `0x${string}`}
        />
    }
}

export default TransferFromWallet
