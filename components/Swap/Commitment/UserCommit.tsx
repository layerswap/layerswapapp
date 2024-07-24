import { FC, useEffect, useRef, useState } from "react";
import { useSettingsState } from "../../../context/settings";
import Image from 'next/image';
import { ExtendedAddress } from "../../Input/Address/AddressPicker/AddressWithIcon";
import { addressFormat } from "../../../lib/address/formatter";
import useWallet from "../../../hooks/useWallet";
import { truncateDecimals } from "../../utils/RoundDecimals";
import { Commit } from "../../../Models/PHTLC";
import { NetworkWithTokens, Token } from "../../../Models/Network";
import { NETWORKS_DETAILS } from "../Atomic";
import SubmitButton from "../../buttons/submitButton";
import { ChangeNetworkButton, ConnectWalletButton, WalletActionButton } from "./butons";
import toast from "react-hot-toast";
import { useRouter } from "next/router";
import { ethers } from "ethers";
import { clear } from "console";

type CurrentProps = {
    source_network: NetworkWithTokens,
    destination_network: NetworkWithTokens | undefined,
    amount: number | undefined;
    address: string;
    source_asset: Token | undefined;
    destination_asset: Token | undefined;
    onCommit: (commitId: string) => void;
    commitId?: string | null;
    setCommitment: (commitment: Commit) => void;
}

export const UserCommitCurrent: FC<CurrentProps> = (props) => {
    const { source_network, destination_network, amount, address, source_asset, destination_asset, onCommit, commitId, setCommitment } = props;
    const { getWithdrawalProvider } = useWallet()
    const source_provider = source_network && getWithdrawalProvider(source_network)
    const destination_provider = destination_network && getWithdrawalProvider(destination_network)

    const wallet = source_provider?.getConnectedWallet()
    const source_address = wallet?.address
    const requestedAmountInUsd = amount && source_asset && (source_asset?.price_in_usd * amount).toFixed(2)
    const requestingCommit = useRef(false)

    const handleCommit = async () => {
        try {
            if (!amount) {
                throw new Error("No amount specified")
            }
            if (!address) {
                throw new Error("Please enter a valid address")
            }
            if (!destination_network) {
                throw new Error("No destination chain")
            }
            if (!source_network?.chain_id) {
                throw new Error("No source chain")
            }
            if (!source_asset) {
                throw new Error("No source asset")
            }
            if (!destination_asset) {
                throw new Error("No destination asset")
            }

            const details = NETWORKS_DETAILS[source_network.name]

            if (!source_provider) {
                throw new Error("No source_provider")
            }
            if (!destination_provider) {
                throw new Error("No destination_provider")
            }
            const { commitId, hash } = await source_provider.createPreHTLC({
                abi: details.abi,
                address,
                amount: amount.toString(),
                destinationChain: destination_network.name,
                sourceChain: source_network.name,
                destinationAsset: destination_asset.symbol,
                sourceAsset: source_asset.symbol,
                lpAddress: source_network.metadata.lp_address,
                tokenContractAddress: source_asset.contract as `0x${string}`,
                decimals: source_asset.decimals,
                atomicContrcat: source_network.metadata.htlc_contract as `0x${string}`,
                chainId: source_network.chain_id,
            })
            onCommit(commitId)
        }
        catch (e) {
            toast(e.message)
        }
    }

    useEffect(() => {
        let commitHandler: any = undefined
        if (source_network && commitId && !requestingCommit.current) {
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
                        commitId: commitId,
                        contractAddress: source_network.metadata.htlc_contract as `0x${string}`
                    })
                    if (data && data.sender != '0x0000000000000000000000000000000000000000') {
                        setCommitment(data)
                        clearInterval(commitHandler)
                    }
                }, 5000)
            })()
        }
        return () => {
            clearInterval(commitHandler)
        }
    }, [source_network])


    return <div>
        <div className="font-normal flex flex-col w-full relative z-10 space-y-4 grow">
            <div className='w-full grow'>
                {
                    source_network && amount && source_asset &&
                    <div className="flex items-center justify-between w-full grow">
                        <div className="flex items-center gap-3">

                            <Image src={source_network.logo} alt={source_network.display_name} width={32} height={32} className="rounded-lg" />
                            <div>
                                <p className="text-primary-text text-sm leading-5">{source_network?.display_name}</p>
                                {
                                    source_address &&
                                    <div className="text-sm group/addressItem text-secondary-text">
                                        <ExtendedAddress address={addressFormat(source_address, source_network)} network={source_network} />
                                    </div>
                                }
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            {
                                <p className="text-primary-text text-sm">{truncateDecimals(amount, source_asset.precision)} {source_asset.symbol}</p>
                            }
                            <p className="text-secondary-text text-sm flex justify-end">${requestedAmountInUsd}</p>
                        </div>

                    </div>
                }
            </div>
            {
                commitId ?
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                            Commited waiting for confirmations
                        </div>
                    </div>
                    :
                    <WalletActionButton
                        activeChain={wallet?.chainId}
                        isConnected={!!wallet}
                        network={source_network}
                        networkChainId={Number(source_network.chain_id)}
                        onClick={handleCommit}
                    >Commit</WalletActionButton>
            }
        </div>
    </div>
}

type DoneProps = {
    source_network: NetworkWithTokens | undefined,
    source_asset: Token | undefined,
    amount: number | undefined,
    commitment: Commit | undefined
}

export const UserCommitDone: FC<DoneProps> = (props) => {
    const { source_network, source_asset, amount, commitment } = props;
    const { getWithdrawalProvider } = useWallet()
    const source_currency = source_network?.tokens.find(t => t.symbol === commitment?.srcAsset)
    const source_provider = source_network && getWithdrawalProvider(source_network)

    const commited_amount = (source_currency && commitment?.amount && Number(ethers.utils.formatUnits(commitment?.amount?.toString(), source_currency?.decimals))) || amount || 0
    const committed_amount_in_usd = source_currency && commited_amount && (source_currency?.price_in_usd * commited_amount).toFixed(2)
    const wallet = source_provider?.getConnectedWallet()

    const source_address = commitment?.sender || wallet?.address
    return <div>
        <div className="font-normal flex flex-col w-full relative z-10 space-y-4 grow">
            <div className='w-full grow'>
                {
                    source_network && amount && source_asset &&
                    <div className="flex items-center justify-between w-full grow">
                        <div className="flex items-center gap-3">
                            <Image src={source_network.logo} alt={source_network.display_name} width={32} height={32} className="rounded-lg" />
                            <div>
                                <p className="text-primary-text text-sm leading-5">{source_network?.display_name}</p>
                                <div className="text-sm group/addressItem text-secondary-text">
                                    {source_address && <ExtendedAddress address={addressFormat(source_address, source_network)} network={source_network} />}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            {
                                <p className="text-primary-text text-sm">{truncateDecimals(commited_amount, source_asset.precision)} {source_asset.symbol}</p>
                            }
                            <p className="text-secondary-text text-sm flex justify-end">${committed_amount_in_usd}</p>
                        </div>
                    </div>
                }
            </div>
        </div>
    </div>
}

