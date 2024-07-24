import { FC, useEffect, useState } from "react";
import { NetworkWithTokens, Token } from "../../../Models/Network";
import { Commit } from "../../../Models/PHTLC";
import Image from 'next/image';
import { ethers } from "ethers";
import { addressFormat } from "../../../lib/address/formatter";
import { ExtendedAddress } from "../../Input/Address/AddressPicker/AddressWithIcon";
import { truncateDecimals } from "../../utils/RoundDecimals";
import useWallet from "../../../hooks/useWallet";
import { NETWORKS_DETAILS } from "../Atomic";
import toast from "react-hot-toast";
import SubmitButton from "../../buttons/submitButton";
import { ChangeNetworkButton, ConnectWalletButton, WalletActionButton } from "./butons";


type UpcomingProps = {
    source_network: NetworkWithTokens,
    source_asset: Token;
    amount: number | undefined,
    commit?: Commit | undefined;
}

export const UserLockUpcoming: FC<UpcomingProps> = (props) => {
    const { source_network, source_asset, commit, amount } = props

    const { getWithdrawalProvider } = useWallet()
    const source_currency = source_network?.tokens.find(t => t.symbol === commit?.srcAsset)
    const source_provider = source_network && getWithdrawalProvider(source_network)
    const commited_amount = (source_currency && commit?.amount && Number(ethers.utils.formatUnits(commit?.amount?.toString(), source_currency?.decimals))) || amount || 0
    const committed_amount_in_usd = source_currency && commited_amount && (source_currency?.price_in_usd * commited_amount).toFixed(2)
    const wallet = source_provider?.getConnectedWallet()
    const source_address = commit?.sender || wallet?.address

    return <div>
        <div className="font-normal flex flex-col w-full relative z-10 space-y-4 grow">
            <div className='w-full grow'>
                {
                    source_network && commit && source_asset &&
                    <div className="flex items-center justify-between w-full grow">
                        <div className="flex items-center gap-3">
                            <Image src={source_network.logo} alt={source_network.display_name} width={32} height={32} className="rounded-lg" />
                            <div>
                                <p className="text-sm leading-5">{source_network?.display_name}</p>
                                <div className="text-sm group/addressItem text-secondary-text">
                                    {source_address && <ExtendedAddress address={addressFormat(source_address, source_network)} network={source_network} />}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            {
                                <p className="text-sm">{truncateDecimals(commited_amount, source_asset.precision)} {source_asset.symbol}</p>
                            }
                            <p className="text-secondary-text text-sm flex justify-end">${committed_amount_in_usd}</p>
                        </div>
                    </div>
                }
            </div>
        </div>
    </div>
}

type CurrentProps = {
    source_network: NetworkWithTokens,
    source_asset: Token;
    commitId: string;
    hashLock: string;
    commit: Commit;
    setCommitment: (commitment: Commit) => void,
    setLocked: (locked: boolean) => void,
    locked: boolean
}

export const UserLockCurrent: FC<CurrentProps> = (props) => {
    const { source_network, source_asset, commitId, hashLock, commit, setCommitment, setLocked, locked } = props
    const [lockLoading, setLockLoading] = useState(false)

    const { getWithdrawalProvider } = useWallet()

    const source_provider = getWithdrawalProvider(source_network)
    const commited_amount = Number(ethers.utils.formatUnits(commit?.amount?.toString(), source_asset?.decimals))
    const committed_amount_in_usd = commited_amount && (source_asset?.price_in_usd * commited_amount).toFixed(2)
    const wallet = source_provider?.getConnectedWallet()
    const source_address = commit?.sender || wallet?.address

    const handleLockAssets = async () => {
        try {
            setLockLoading(true)
            if (!source_network?.chain_id)
                throw Error("No chain id")
            if (!source_provider)
                throw new Error("No source provider")
            if (!hashLock)
                throw new Error("No destination hashlock")
            const details = NETWORKS_DETAILS[source_network.name]
            if (!details)
                throw new Error("No source network details")

            const { hash, result } = await source_provider.lockCommitment({
                abi: details.abi,
                chainId: source_network.chain_id,
                commitId: commitId as string,
                lockId: hashLock,
                contractAddress: source_network.metadata.htlc_contract as `0x${string}`
            })
            setLocked(true)
        }
        catch (e) {
            toast(e.message)
        }
        finally {
            setLockLoading(false)
        }
    }

    useEffect(() => {
        let commitHandler: any = undefined
        if (!commit?.locked) {
            (async () => {
                commitHandler = setInterval(async () => {
                    console.log('******** polling')
                    if (!source_network?.chain_id)
                        throw Error("No chain id")
                    if (!source_provider)
                        throw new Error("No source provider")
                    const details = NETWORKS_DETAILS[source_network.name]
                    if (!details)
                        throw new Error("No source network details")

                    const data = await source_provider.getCommitment({
                        abi: details.abi,
                        chainId: source_network.chain_id,
                        commitId: commitId as string,
                        contractAddress: source_network.metadata.htlc_contract as `0x${string}`
                    })
                    if (data?.locked) {
                        setCommitment(data)
                        clearInterval(commitHandler)
                    }
                }, 5000)
            })()
        }
        return () => clearInterval(commitHandler)
    }, [source_provider])


    return <div>
        <div className="font-normal flex flex-col w-full relative z-10 space-y-4 grow">
            <div className='w-full grow'>
                {
                    source_network && commit && source_asset &&
                    <div className="flex items-center justify-between w-full grow">
                        <div className="flex items-center gap-3">
                            <Image src={source_network.logo} alt={source_network.display_name} width={32} height={32} className="rounded-lg" />
                            <div>
                                <p className="text-sm leading-5">{source_network?.display_name}</p>
                                <div className="text-sm group/addressItem text-secondary-text">
                                    {source_address && <ExtendedAddress address={addressFormat(source_address, source_network)} network={source_network} />}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            {
                                <p className="text-sm">{truncateDecimals(commited_amount, source_asset.precision)} {source_asset.symbol}</p>
                            }
                            <p className="text-secondary-text text-sm flex justify-end">${committed_amount_in_usd}</p>
                        </div>
                    </div>
                }
            </div>
            {
                locked ?
                    <p className="text-sm text-primary-text">Assets locked waiting for confirmations</p>
                    :
                    <WalletActionButton
                        activeChain={wallet?.chainId}
                        isConnected={!!wallet}
                        network={source_network}
                        networkChainId={Number(source_network.chain_id)}
                        onClick={handleLockAssets}
                    >
                        Lock
                    </WalletActionButton>
            }
        </div>
    </div>

}

export const UserLockDone: FC<UpcomingProps> = (props) => {
    const { source_network, source_asset, commit, amount } = props

    const { getWithdrawalProvider } = useWallet()
    const source_currency = source_network?.tokens.find(t => t.symbol === commit?.srcAsset)
    const source_provider = source_network && getWithdrawalProvider(source_network)
    const commited_amount = (source_currency && commit?.amount && Number(ethers.utils.formatUnits(commit?.amount?.toString(), source_currency?.decimals))) || amount || 0
    const committed_amount_in_usd = source_currency && commited_amount && (source_currency?.price_in_usd * commited_amount).toFixed(2)
    const wallet = source_provider?.getConnectedWallet()
    const source_address = commit?.sender || wallet?.address

    return <div>
        <div className="font-normal flex flex-col w-full relative z-10 space-y-4 grow">
            <div className='w-full grow'>
                {
                    source_network && commit && source_asset &&
                    <div className="flex items-center justify-between w-full grow">
                        <div className="flex items-center gap-3">
                            <Image src={source_network.logo} alt={source_network.display_name} width={32} height={32} className="rounded-lg" />
                            <div>
                                <p className="text-sm leading-5">{source_network?.display_name}</p>
                                <div className="text-sm group/addressItem text-secondary-text">
                                    {source_address && <ExtendedAddress address={addressFormat(source_address, source_network)} network={source_network} />}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            {
                                <p className="text-sm">{truncateDecimals(commited_amount, source_asset.precision)} {source_asset.symbol}</p>
                            }
                            <p className="text-secondary-text text-sm flex justify-end">${committed_amount_in_usd}</p>
                        </div>
                    </div>
                }
            </div>
        </div>
    </div>
}