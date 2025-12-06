import { FC, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { PublishedSwapTransactions } from "@/lib/apiClients/layerSwapApiClient";
import { ChangeNetworkButton, ConnectWalletButton } from "../../Common/buttons";
import TransferTokenButton from "./TransferToken";
import ActionMessages from "../../../messages/TransactionMessages";
import { useQueryState } from "@/context/query";
import { WithdrawPageProps } from "../../Common/sharedTypes";
import { useSelectedAccount } from "@/context/swapAccounts";
import useWallet from "@/hooks/useWallet";

export const EVMWalletWithdrawal: FC<WithdrawPageProps> = ({
    swapBasicData,
    refuel,
    swapId
}) => {

    const { source_network, destination_network, destination_address } = swapBasicData
    const { isConnected, chain: activeChain } = useAccount();
    const selectedSourceAccount = useSelectedAccount("from", swapBasicData.source_network.name);
    const { sameAccountNetwork } = useQueryState()
    const { wallets } = useWallet(source_network, 'withdrawal')
    const wallet = wallets.find(w => w.id === selectedSourceAccount?.id)
    const networkChainId = Number(source_network?.chain_id) ?? undefined

    const [savedTransactionHash, setSavedTransactionHash] = useState<string>()

    useEffect(() => {
        if (!swapId) return;
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

    if ((source_network?.name.toLowerCase() === sameAccountNetwork?.toLowerCase() || destination_network?.name.toLowerCase() === sameAccountNetwork?.toLowerCase())
        && (selectedSourceAccount?.address && destination_address && selectedSourceAccount?.address.toLowerCase() !== destination_address?.toLowerCase())) {
        const network = source_network?.name.toLowerCase() === sameAccountNetwork?.toLowerCase() ? source_network : destination_network
        return <ActionMessages.DifferentAccountsNotAllowedError network={network?.display_name!} />
    }

    if (!isConnected || !wallet) {
        return <ConnectWalletButton />
    }
    else if (activeChain?.id !== networkChainId && source_network) {
        return <ChangeNetworkButton
            chainId={networkChainId}
            network={source_network}
        />
    }
    else {
        return <TransferTokenButton
            swapData={swapBasicData}
            refuel={refuel}
            chainId={networkChainId}
            savedTransactionHash={savedTransactionHash as `0x${string}`}
        />
    }
}