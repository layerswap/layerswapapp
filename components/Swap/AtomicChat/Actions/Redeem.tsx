import { FC, useEffect } from "react"
import useWallet from "../../../../hooks/useWallet";
import { NETWORKS_DETAILS } from "../../Atomic";
import { useAtomicState } from "../../../../context/atomicContext";
import ActionStatus from "./ActionStatus";

export const RedeemAction: FC = () => {
    const { source_network, committment, hashLock, setSourceLock } = useAtomicState()

    const { getWithdrawalProvider } = useWallet()

    const dsource_provider = source_network && getWithdrawalProvider(source_network)
    const contract = source_network?.metadata.htlc_contract

    useEffect(() => {
        let commitHandler: any = undefined
        if (committment?.locked) {
            (async () => {
                commitHandler = setInterval(async () => {
                    if (!source_network?.chain_id)
                        throw Error("No chain id")
                    if (!dsource_provider)
                        throw new Error("No destination provider")
                    if (!hashLock)
                        throw new Error("No destination hashlock")
                    const details = NETWORKS_DETAILS[source_network.name]
                    if (!details)
                        throw new Error("No destination network details")

                    const data = await dsource_provider.getLock({
                        abi: details.abi,
                        chainId: source_network.chain_id,
                        lockId: hashLock,
                        contractAddress: contract as `0x${string}`,
                        lockDataResolver: details.lockDataResolver
                    })
                    if (data.redeemed) {
                        setSourceLock(data)
                        clearInterval(commitHandler)
                    }
                }, 5000)
            })()
        }
        return () => clearInterval(commitHandler)
    }, [source_network, committment, hashLock])

    return <ActionStatus
        status="pending"
        title='Releasing funds'
    />
}
