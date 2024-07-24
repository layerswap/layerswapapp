import { FC, useEffect, useState } from "react";
import { NetworkWithTokens, Token } from "../../../Models/Network";
import Image from 'next/image';
import { AssetLock, Commit } from "../../../Models/PHTLC";
import { ExtendedAddress } from "../../Input/Address/AddressPicker/AddressWithIcon";
import { addressFormat } from "../../../lib/address/formatter";
import { truncateDecimals } from "../../utils/RoundDecimals";
import { ethers } from "ethers";
import useWallet from "../../../hooks/useWallet";
import { NETWORKS_DETAILS } from "../Atomic";

type UpcomingProps = {
    source_network: NetworkWithTokens,
    destination_network: NetworkWithTokens,
    amount: number;
    address: string;
    source_asset: Token;
    destination_asset: Token;
}


export const LpLockUpcoming: FC<UpcomingProps> = (props) => {
    const { source_network, destination_network, amount, address, source_asset, destination_asset } = props

    return <div>
        <div className="font-normal flex flex-col w-full relative z-10 space-y-4 grow">
            <div className='w-full grow'>
                {
                    destination_network && destination_asset &&
                    <div className="flex items-center justify-between w-full grow">
                        <div className="flex items-center gap-3">
                            <Image src={destination_network.logo} alt={destination_network.display_name} width={32} height={32} className="rounded-lg" />
                            <div>
                                <p className="text-sm leading-5">{destination_network?.display_name}</p>
                                <div className="text-sm group/addressItem text-secondary-text">
                                    <ExtendedAddress address={addressFormat(address, destination_network)} network={destination_network} />
                                </div>
                            </div>
                        </div>
                    </div>
                }
            </div>
        </div>
    </div>
}

type CurrentProps = {
    source_network: NetworkWithTokens,
    destination_network: NetworkWithTokens,
    amount: number;
    address: string;
    source_asset: Token;
    destination_asset: Token;
    commitment: Commit
    commitmentId: string;
    setDestinationLock: (data: AssetLock) => void;
    destinationLock: AssetLock | null;
    setHashLock: (data: string) => void;
}

export const LpLockCurrent: FC<CurrentProps> = (props) => {
    const { source_network, destination_network, amount, address, source_asset, destination_asset, commitment, commitmentId, setDestinationLock, destinationLock, setHashLock } = props
    const { getWithdrawalProvider } = useWallet()

    const destination_provider = destination_network && getWithdrawalProvider(destination_network)


    useEffect(() => {
        let lockHandler: any = undefined
        if (destination_provider && destination_network && !destinationLock && commitmentId) {
            lockHandler = setInterval(async () => {
                const details = NETWORKS_DETAILS[destination_network.name]
                if (!destination_network.chain_id)
                    throw Error("No chain id")

                const destinationLockId = await destination_provider.getLockIdByCommitId({
                    abi: details.abi,
                    chainId: destination_network.chain_id,
                    commitId: commitmentId,
                    contractAddress: destination_network.metadata.htlc_contract as `0x${string}`
                })

                if (destinationLockId && destinationLockId != '0x0000000000000000000000000000000000000000000000000000000000000000') {
                    setHashLock(destinationLockId)
                    const data = await destination_provider.getLock({
                        abi: details.abi,
                        chainId: destination_network.chain_id,
                        lockId: destinationLockId as string,
                        contractAddress: destination_network.metadata.htlc_contract as `0x${string}`,
                        lockDataResolver: details.lockDataResolver
                    })
                    setDestinationLock(data)
                    clearInterval(lockHandler)
                }
            }, 5000)
        }
        return () => {
            lockHandler && clearInterval(lockHandler);
        };
    }, [destination_provider, destination_network])

    return <div>
        <div className="font-normal flex flex-col w-full relative z-10 space-y-4 grow">
            <div className='w-full grow'>
                {
                    commitment && destination_network && destination_asset &&
                    <div className="flex items-center justify-between w-full grow">
                        <div className="flex items-center gap-3">
                            <Image src={destination_network.logo} alt={destination_network.display_name} width={32} height={32} className="rounded-lg" />
                            <div>
                                <p className="text-primary-text text-sm leading-5">{destination_network?.display_name}</p>
                                <div className="text-sm group/addressItem text-secondary-text">
                                    <ExtendedAddress address={addressFormat(commitment.sender, destination_network)} network={destination_network} />
                                </div>
                            </div>
                        </div>
                    </div>
                }
            </div>
        </div>
    </div>
}
type DoneProps = {
    source_network: NetworkWithTokens,
    destination_network: NetworkWithTokens,
    amount: number;
    address: string;
    source_asset: Token;
    destination_asset: Token;
    destinationLock: AssetLock;
}

export const LpLockDone: FC<DoneProps> = (props) => {
    const { source_network, destination_network, destination_asset, destinationLock } = props
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