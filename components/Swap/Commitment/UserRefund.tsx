import { FC } from "react"
import { WalletActionButton } from "./butons"
import useWallet from "../../../hooks/useWallet";
import { NetworkWithTokens } from "../../../Models/Network";
import { NETWORKS_DETAILS } from "../Atomic";
import toast from "react-hot-toast";

type CurrentProps = {
    commitId: string | null;
    lockId: string | null;
    source_network: NetworkWithTokens | undefined;
    setRequestedRefund: (value: boolean) => void;
    setCompletedRefundHash: (value: string) => void;
}

export const UserRefundCurrent: FC<CurrentProps> = (props) => {
    const { commitId, lockId, source_network, setRequestedRefund, setCompletedRefundHash } = props
    const { getWithdrawalProvider } = useWallet()

    const source_provider = getWithdrawalProvider(source_network!)
    const wallet = source_provider?.getConnectedWallet()

    const handleRefundAssets = async () => {
        try {
            if (!source_network) throw new Error("No source network")
            if (!commitId) throw new Error("No commitment details")
            setRequestedRefund(true)

            const details = NETWORKS_DETAILS[source_network.name]

            const res = await source_provider?.refund({
                commitId: commitId,
                lockId: lockId,
                abi: details.abi,
                chainId: source_network.chain_id ?? '',
                contractAddress: source_network.metadata.htlc_contract as `0x${string}`
            })
            setCompletedRefundHash(res)
        }
        catch (e) {
            toast(e.message)
        }

    }

    return <div>
        <div className="font-normal flex flex-col w-full relative z-10 space-y-4 grow">
            <WalletActionButton
                activeChain={wallet?.chainId}
                isConnected={!!wallet}
                network={source_network!}
                networkChainId={Number(source_network?.chain_id)}
                onClick={handleRefundAssets}
            >
                Refund
            </WalletActionButton>
        </div>
    </div>

}