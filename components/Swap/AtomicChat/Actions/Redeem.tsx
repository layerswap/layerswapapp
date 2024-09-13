import { FC, useEffect } from "react"
import useWallet from "../../../../hooks/useWallet";
import { useAtomicState } from "../../../../context/atomicContext";
import ActionStatus from "./ActionStatus";

export const RedeemAction: FC = () => {
    const { destination_network, source_network, committment, setDestinationLock, setSourceLock, destination_asset, source_asset } = useAtomicState()

    const { getWithdrawalProvider } = useWallet()

    const source_provider = source_network && getWithdrawalProvider(source_network)
    const destination_provider = destination_network && getWithdrawalProvider(destination_network)
    const destination_contract = destination_asset?.contract ? destination_network?.metadata.htlc_token_contract : destination_network?.metadata.htlc_native_contract
    const source_contract = source_asset?.contract ? source_network?.metadata.htlc_token_contract : source_network?.metadata.htlc_native_contract

    useEffect(() => {
        let commitHandler: any = undefined
        if (committment?.locked) {
            (async () => {
                commitHandler = setInterval(async () => {
                    if (!destination_network?.chain_id)
                        throw Error("No chain id")
                    if (!destination_provider)
                        throw new Error("No destination provider")

                    const data = committment?.lockId ? await destination_provider.getLock({
                        type: destination_asset?.contract ? 'erc20' : 'native',
                        chainId: destination_network.chain_id,
                        lockId: committment.lockId,
                        contractAddress: destination_contract as `0x${string}`,
                    }) : null
                    if (data) setDestinationLock(data)
                    if (data?.redeemed) {
                        clearInterval(commitHandler)
                    }
                }, 5000)
            })()
        }
        return () => clearInterval(commitHandler)
    }, [destination_network, committment])

    useEffect(() => {
        let commitHandler: any = undefined
        if (committment?.locked) {
            (async () => {
                commitHandler = setInterval(async () => {
                    if (!source_network?.chain_id)
                        throw Error("No chain id")
                    if (!source_provider)
                        throw new Error("No destination provider")

                    const data = committment?.lockId ? await source_provider.getLock({
                        type: source_asset?.contract ? 'erc20' : 'native',
                        chainId: source_network.chain_id,
                        lockId: committment.lockId,
                        contractAddress: source_contract as `0x${string}`,
                    }) : null
                    if (data) setSourceLock(data)
                    if (data?.redeemed) {
                        clearInterval(commitHandler)
                    }
                }, 5000)
            })()
        }
        return () => clearInterval(commitHandler)
    }, [source_network, committment])

    return <ActionStatus
        status="pending"
        title='Releasing funds'
    />
}
