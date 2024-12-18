import { FC, useEffect } from "react";
import { Network, Token } from "../../../../Models/Network";
import useWallet, { WalletProvider } from "../../../../hooks/useWallet";
import { useAtomicState } from "../../../../context/atomicContext";
import ActionStatus from "./ActionStatus";
import shortenAddress from "../../../utils/ShortenAddress";
import { ExternalLink } from "lucide-react";
import LightClient from "../../../../lib/lightClient";

export const LpLockingAssets: FC = () => {
    const { destination_network, commitId, setDestinationDetails, destination_asset } = useAtomicState()
    const { getWithdrawalProvider } = useWallet()

    const destination_provider = destination_network && getWithdrawalProvider(destination_network)

    const atomicContract = (destination_asset?.contract ? destination_network?.metadata.htlc_token_contract : destination_network?.metadata.htlc_native_contract) as `0x${string}`
    const supportsHelios = destination_network?.chain_id && destination_network?.chain_id == "11155111"

    const getDetails = async ({ provider, network, commitId, asset }: { provider: WalletProvider, network: Network, commitId: string, asset: Token }) => {
        if (supportsHelios) {
            const lightClient = new LightClient({
                network: network,
                token: asset,
                commitId,
                atomicContract
            })

            const destinationDetails = await lightClient.getHashlock()
            if (destinationDetails) {
                setDestinationDetails(destinationDetails)
                return
            }
        }

        let lockHandler: any = undefined
        lockHandler = setInterval(async () => {
            if (!network.chain_id)
                throw Error("No chain id")

            const destiantionDetails = await provider.getDetails({
                type: asset?.contract ? 'erc20' : 'native',
                chainId: network.chain_id,
                id: commitId,
                contractAddress: atomicContract
            })

            if (destiantionDetails?.hashlock) {
                setDestinationDetails(destiantionDetails)
                clearInterval(lockHandler)
            }

        }, 5000)

        return () => {
            lockHandler && clearInterval(lockHandler);
        };

    }

    useEffect(() => {
        (async () => {
            if (destination_provider && destination_network && commitId && destination_asset) {
                await getDetails({ provider: destination_provider, network: destination_network, commitId, asset: destination_asset })
            }
        })()
    }, [destination_provider, destination_network, commitId])

    return <ActionStatus
        status="pending"
        title={
            <span>
                <span>LP</span> <span>(</span><a target="_blank" className="inline-flex items-center gap-1" href={destination_network?.account_explorer_template.replace('{0}', destination_network.metadata.lp_address)}><span className="underline hover:no-underline">{destination_network?.metadata?.lp_address && shortenAddress(destination_network?.metadata?.lp_address)}</span> <ExternalLink className="h-3.5 w-3.5" /></a><span>)</span> <span>is locking your assets on the destination network</span>
            </span>
        }
    />
}