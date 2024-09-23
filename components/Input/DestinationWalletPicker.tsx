import { useFormikContext } from "formik";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { FC, useEffect, useRef, useState } from "react";
import useWallet, { WalletPurpose } from "../../hooks/useWallet";
import shortenAddress from "../utils/ShortenAddress";
import Image from "next/image";
import { ChevronDown, Plus } from "lucide-react";
import Modal from "../modal/modal";
import { RouteNetwork } from "../../Models/Network";
import ConnectButton from "../buttons/connectButton";
import FilledCheck from "../icons/FilledCheck";
import { Wallet } from "../../stores/walletStore";
import { AddressGroup, AddressItem, AddressTriggerProps } from "./Address/AddressPicker";
import { Partner } from "../../Models/Partner";
import AddressIcon from "../AddressIcon";



const Component = (props: AddressTriggerProps) => {
    const { destination, disabled, addressItem, connectedWallet, partner } = props
    return <>
        {

            addressItem &&
            <div className="flex items-center space-x-2 text-sm leading-4">
                {<>
                    <div className="rounded-lg bg-secondary-500 flex space-x-1 items-center py-0.5 pl-2 pr-1 cursor-pointer">
                        <div className="inline-flex items-center relative p-0.5">
                            <ResolvedIcon addressItem={addressItem} partner={partner} wallet={connectedWallet} />
                        </div>
                        <div className="text-primary-text">
                            {shortenAddress(addressItem.address)}
                        </div>
                        <div className="w-5 h-5 items-center flex">
                            <ChevronDown className="h-4 w-4" aria-hidden="true" />
                        </div>
                    </div>
                </>
                }
            </div >
        }
    </>
}
type AdderssIconprops = {
    addressItem: AddressItem,
    wallet: Wallet | undefined,
    partner: Partner | undefined
}
const ResolvedIcon = (props: AdderssIconprops) => {
    const { addressItem, wallet, partner } = props
    if (partner?.is_wallet && addressItem.group === AddressGroup.FromQuery) {
        return <div className="rounded-lg bg-secondary-700 pl-2 flex items-center space-x-2 text-sm leading-4">
            {
                partner?.logo &&
                <Image
                    alt="Partner logo"
                    className='rounded-md object-contain'
                    src={partner.logo}
                    width="20"
                    height="20"
                />
            }
        </div>
    }
    else if (addressItem.group === AddressGroup.ConnectedWallet && wallet) {
        return <wallet.icon className="w-5 h-5" />
    }
    else {
        return <AddressIcon className="h-5 w-5 p-0.5" address={addressItem.address} size={20} />
    }
}

type WalletListProps = {
    route?: RouteNetwork,
    purpose: WalletPurpose
    onSelect: (wallet?: Wallet) => void
}


const WalletsList: FC<WalletListProps> = ({ route, purpose, onSelect }) => {
    const {
        values,
    } = useFormikContext<SwapFormValues>();

    const { provider } = useWallet(route, purpose)

    return (
        <div className="space-y-3">
            <ConnectButton className="w-full flex justify-center p-2 bg-secondary-700 rounded-md hover:bg-secondary-600">
                <div className="flex items-center text-secondary-text gap-1 px-3 py-1">
                    <Plus className="h-4 w-4" />
                    <span className="text-sm">
                        Connect new wallet
                    </span>
                </div>
            </ConnectButton>
            <div className="flex flex-col justify-start space-y-3">
                {
                    provider?.connectedWallets?.map((wallet, index) => {
                        const isSelected = values.source_wallet?.address === wallet.address

                        return <div key={index} onClick={() => onSelect(wallet)} className="w-full cursor-pointer relative items-center justify-between gap-2 flex rounded-md outline-none bg-secondary-700 text-primary-text p-3 border border-secondary-500 ">
                            <div className="flex space-x-4 items-center">
                                {
                                    wallet.connector &&
                                    <div className="inline-flex items-center relative">
                                        <wallet.icon className="w-9 h-9 p-0.5 rounded-md bg-secondary-800" />
                                    </div>
                                }
                                <div>
                                    {
                                        !wallet.isLoading && wallet.address &&
                                        <p className="text-sm">{shortenAddress(wallet.address)}</p>
                                    }
                                    <p className="text-xs text-secondary-text">
                                        {wallet.connector}
                                    </p>
                                </div>
                            </div>
                            <div className="flex h-6 items-center px-1">
                                {
                                    isSelected &&
                                    <FilledCheck />
                                }
                            </div>
                        </div>
                    })
                }
            </div>
            <div onClick={() => onSelect()} className="underline text-base text-center text-secondary-text cursor-pointer">
                Continue without a wallet
            </div>
        </div>
    )
}


export default Component