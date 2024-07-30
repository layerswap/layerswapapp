import { FC, useEffect } from "react"
import { NetworkWithTokens, Token } from "../../../Models/Network";
import { AssetLock, Commit } from "../../../Models/PHTLC";
import useWallet from "../../../hooks/useWallet";

type UpcomingProps = {
    destination_network: NetworkWithTokens,
    commitment: Commit
    hashLock: string;
    setSourceLock: (data: AssetLock) => void;
}

export const RedeemUpcoming: FC<UpcomingProps> = (props) => {
    const { destination_network, commitment, hashLock, setSourceLock } = props

    const { getWithdrawalProvider } = useWallet()

    const destination_provider = destination_network && getWithdrawalProvider(destination_network)
    const contract = destination_network?.metadata.htlc_contract
    console.log('redeem data')
    useEffect(() => {
        let commitHandler: any = undefined
        if (commitment?.locked) {
            (async () => {
                commitHandler = setInterval(async () => {
                    if (!destination_network?.chain_id)
                        throw Error("No chain id")
                    if (!destination_provider)
                        throw new Error("No destination provider")
                    if (!hashLock)
                        throw new Error("No destination hashlock")

                    const data = await destination_provider.getLock({
                        chainId: destination_network.chain_id,
                        lockId: hashLock,
                        contractAddress: contract as `0x${string}`,
                    })
                    console.log('redeem data', data)
                    if (data.redeemed) {
                        setSourceLock(data)
                        clearInterval(commitHandler)
                    }
                }, 5000)
            })()
        }
        return () => clearInterval(commitHandler)
    }, [destination_network, commitment, hashLock])

    return <></>
}

export const RedeemCurrent = () => {
    return <></>
}

export const RedeemDone = () => {
    return <></>
}
