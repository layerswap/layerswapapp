import { FC, useEffect } from "react";
import { NetworkWithTokens, Token } from "../../../../Models/Network";
import Image from 'next/image';
import { ExtendedAddress } from "../../../Input/Address/AddressPicker/AddressWithIcon";
import { addressFormat } from "../../../../lib/address/formatter";
import { truncateDecimals } from "../../../utils/RoundDecimals";
import { ethers } from "ethers";
import useWallet from "../../../../hooks/useWallet";
import { useAtomicState } from "../../../../context/atomicContext";
import ActionStatus from "./Status/ActionStatus";
import shortenAddress from "../../../utils/ShortenAddress";
import { ExternalLink } from "lucide-react";
import { Commit } from "../../../../Models/PHTLC";

export const LpLockingAssets: FC = () => {
    const { destination_network, commitId, setDestinationDetails, destination_asset, source_network } = useAtomicState()
    const { getWithdrawalProvider } = useWallet()

    const destination_provider = destination_network && getWithdrawalProvider(destination_network)

    const atomicContract = (destination_asset?.contract ? destination_network?.metadata.htlc_token_contract : destination_network?.metadata.htlc_native_contract) as `0x${string}`

    useEffect(() => {
        let lockHandler: any = undefined
        if (destination_provider && destination_network && commitId) {
            lockHandler = setInterval(async () => {
                if (!destination_network.chain_id)
                    throw Error("No chain id")

                const destiantionDetails = await destination_provider.getDetails({
                    type: destination_asset?.contract ? 'erc20' : 'native',
                    chainId: destination_network.chain_id,
                    id: commitId,
                    contractAddress: atomicContract
                })

                if (destiantionDetails?.hashlock) {
                    setDestinationDetails(destiantionDetails)
                    clearInterval(lockHandler)
                }

            }, 5000)
        }
        return () => {
            lockHandler && clearInterval(lockHandler);
        };
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
type DoneProps = {
    source_network: NetworkWithTokens,
    destination_network: NetworkWithTokens,
    amount: number;
    address: string;
    source_asset: Token;
    destination_asset: Token;
    destinationDetails: Commit;
}

export const LpLockDone: FC<DoneProps> = (props) => {
    const { source_network, destination_network, destination_asset, destinationDetails: destinationLock } = props
    const destinationLockedAmount = destination_asset && destinationLock?.amount && Number(ethers.utils.formatUnits(destinationLock?.amount?.toString(), destination_asset?.decimals))
    const destinationLocAmountInUSD = destinationLockedAmount && (destination_asset?.price_in_usd * destinationLockedAmount).toFixed(2)

    return <div>
        <div className="font-normal flex flex-col w-full relative z-10 space-y-4 grow">
            <div className='w-full grow'>
                {
                    destinationLock && destination_network && destination_asset &&
                    <div className="flex items-center justify-between w-full grow">
                        <div className="flex items-center gap-3">

                            <Image src={destination_network.logo} alt={destination_network.display_name} width={32} height={32} className="rounded-lg" />
                            <div>
                                <p className="text-primary-text text-sm leading-5">{source_network?.display_name}</p>
                                <div className="text-sm group/addressItem text-secondary-text">
                                    <ExtendedAddress address={addressFormat(destinationLock.sender, destination_network)} network={destination_network} />
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            {destinationLockedAmount &&
                                <p className="text-primary-text text-sm">{truncateDecimals(destinationLockedAmount, destination_asset.precision)} {destination_asset.symbol}</p>
                            }
                            <p className="text-secondary-text text-sm flex justify-end">${destinationLocAmountInUSD}</p>
                        </div>
                    </div>
                }
            </div>
        </div>
    </div>
}