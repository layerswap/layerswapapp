import { FC, useEffect } from "react"
import { NetworkWithTokens, Token } from "../../../Models/Network";
import { AssetLock, Commit } from "../../../Models/PHTLC";
import useWallet from "../../../hooks/useWallet";
import { NETWORKS_DETAILS } from "../Atomic";

type UpcomingProps = {
    source_network: NetworkWithTokens,
    commitment: Commit
    hashLock: string;
    source_asset: Token | undefined;
    setSourceLock: (data: AssetLock) => void;
}

export const RedeemUpcoming: FC<UpcomingProps> = (props) => {
    const { source_network, commitment, hashLock, setSourceLock, source_asset } = props

    const { getWithdrawalProvider } = useWallet()

    const source_provider = source_network && getWithdrawalProvider(source_network)
    const contract =  source_network?.metadata.htlc_contract
    console.log('redeem data' )
    useEffect(() => {
        let commitHandler: any = undefined
        if (commitment?.locked) {
            (async () => {
                commitHandler = setInterval(async () => {
                    if (!source_network?.chain_id)
                        throw Error("No chain id")
                    if (!source_provider)
                        throw new Error("No source provider")
                    if (!hashLock)
                        throw new Error("No destination hashlock")
                    const details = NETWORKS_DETAILS[source_network.name]
                    if (!details)
                        throw new Error("No source network details")

                    const data = await source_provider.getLock({
                        abi: details.abi,
                        chainId: source_network.chain_id,
                        lockId: hashLock,
                        contractAddress: contract as `0x${string}`,
                        lockDataResolver: details.lockDataResolver
                    })
                    console.log('redeem data', data )
                    if (data.redeemed) {
                        setSourceLock(data)
                        clearInterval(commitHandler)
                    }
                }, 5000)
            })()
        }
        return () => clearInterval(commitHandler)
    }, [source_network, commitment, hashLock])

    return <></>
}

export const RedeemCurrent = () => {
    return <></>
}

export const RedeemDone = () => {
    return <></>
}
