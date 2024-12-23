import { FC, useEffect } from "react"
import useWallet from "../../../../hooks/useWallet";
import { useAtomicState } from "../../../../context/atomicContext";
import ActionStatus from "./Status/ActionStatus";

export const RedeemAction: FC = () => {
    const { destination_network, source_network, sourceDetails, setDestinationDetails, setSourceDetails, destination_asset, source_asset, commitId } = useAtomicState()

    const { getWithdrawalProvider } = useWallet()

    const source_provider = source_network && getWithdrawalProvider(source_network)
    const destination_provider = destination_network && getWithdrawalProvider(destination_network)
    const destination_contract = destination_asset?.contract ? destination_network?.metadata.htlc_token_contract : destination_network?.metadata.htlc_native_contract
    const source_contract = source_asset?.contract ? source_network?.metadata.htlc_token_contract : source_network?.metadata.htlc_native_contract

    useEffect(() => {
        let commitHandler: any = undefined;
        if (commitId) {
            (async () => {
                commitHandler = setInterval(async () => {
                    if (!destination_network?.chain_id)
                        throw Error("No chain id")
                    if (!destination_provider)
                        throw new Error("No destination provider")

                    const data = sourceDetails?.id ? await destination_provider.getDetails({
                        type: destination_asset?.contract ? 'erc20' : 'native',
                        chainId: destination_network.chain_id,
                        id: commitId,
                        contractAddress: destination_contract as `0x${string}`,
                    }) : null
                    if (data) setDestinationDetails(data)
                    if (data?.claimed == 3) {
                        clearInterval(commitHandler)
                    }
                }, 5000)
            })()
        }
        return () => clearInterval(commitHandler)
    }, [destination_network, sourceDetails])

    useEffect(() => {
        let commitHandler: any = undefined;
        if (commitId) {
            (async () => {
                commitHandler = setInterval(async () => {
                    if (!source_network?.chain_id)
                        throw Error("No chain id")
                    if (!source_provider)
                        throw new Error("No destination provider")

                    const data = sourceDetails?.id ? await source_provider.getDetails({
                        type: source_asset?.contract ? 'erc20' : 'native',
                        chainId: source_network.chain_id,
                        id: commitId,
                        contractAddress: source_contract as `0x${string}`,
                    }) : null
                    if (data) setSourceDetails(data)
                    if (data?.claimed == 3) {
                        clearInterval(commitHandler)
                    }
                }, 5000)
            })()
        }
        return () => clearInterval(commitHandler)
    }, [source_network, sourceDetails])

    return <ActionStatus
        status="pending"
        title='Assets are currently being released'
    />
}
