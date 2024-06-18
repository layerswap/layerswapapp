import { FC, useEffect, useRef, useState } from "react"
import { AddressGroup, AddressItem } from ".";
import AddressIcon from "../../../AddressIcon";
import shortenAddress from "../../../utils/ShortenAddress";
import { History, ExternalLink, Copy, Check, ChevronDown, AlertTriangle, WalletIcon, Pencil } from "lucide-react";
import { Wallet } from "../../../../stores/walletStore";
import Image from "next/image";
import { Partner } from "../../../../Models/Partner";
import { Network } from "../../../../Models/Network";
import { Popover, PopoverContent, PopoverTrigger } from "../../../shadcn/popover";
import useCopyClipboard from "../../../../hooks/useCopyClipboard";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../shadcn/tooltip";

type Props = {
    addressItem: AddressItem;
    connectedWallet?: Wallet | undefined;
    partner?: Partner;
    destination: Network;
}

const AddressWithIcon: FC<Props> = ({ addressItem, connectedWallet, partner, destination }) => {

    const difference_in_days = addressItem?.date ? Math.round(Math.abs((new Date()).getTime() - new Date(addressItem.date).getTime())) : undefined

    const descriptions = [
        {
            group: AddressGroup.RecentlyUsed,
            text: (difference_in_days === 0 ?
                <p>Used today</p>
                :
                (difference_in_days && difference_in_days > 1 ?
                    <p><span>Used</span> {difference_in_days} <span>days ago</span></p>
                    : <p>Used yesterday</p>))
            ,
            icon: History
        },
        {
            group: AddressGroup.ManualAdded,
            text: <p>Added Manually</p>,
            icon: Pencil
        },
        {
            group: AddressGroup.ConnectedWallet,
            text: <p>{connectedWallet?.connector || 'Connected wallet'}</p>,
            icon: connectedWallet?.icon || WalletIcon
        },
        {
            group: AddressGroup.FromQuery,
            text: <p><span>Autofilled from</span> <span>{partner?.display_name ?? 'URL'}</span></p>,
            icon: AlertTriangle
        }
    ]

    const itemDescription = descriptions.find(d => d.group === addressItem.group)

    return (
        <div className='flex gap-3 text-sm items-center'>
            <div className='flex bg-secondary-400 text-primary-text  items-center justify-center rounded-md h-9 overflow-hidden w-9'>
                {
                    (partner?.is_wallet && addressItem.group === AddressGroup.FromQuery) ?
                        <div className="shrink-0 flex items-center pointer-events-none">
                            {
                                partner?.logo &&
                                <Image
                                    alt="Partner logo"
                                    className='rounded-md object-contain'
                                    src={partner.logo}
                                    width="36"
                                    height="36"
                                />
                            }
                        </div>
                        :
                        <AddressIcon className="scale-150 h-9 w-9" address={addressItem.address} size={36} />
                }
            </div>
            <div className="flex flex-col items-start">

                <ExtendedAddress address={addressItem.address} network={destination} />

                <div className="text-secondary-text">
                    <div className="inline-flex items-center gap-1.5">
                        {itemDescription?.icon && <itemDescription.icon className="rounded flex-shrink-0 h-4 w-4" />}
                        {itemDescription?.text}
                    </div>
                </div>
            </div>
        </div>
    )
}

type ExtendedAddressProps = {
    address: string;
    network: Network;
}

export const ExtendedAddress: FC<ExtendedAddressProps> = ({ address, network }) => {
    const [isCopied, setCopied] = useCopyClipboard()
    const [isPopoverOpen, setPopoverOpen] = useState(false)

    return (
        <div onClick={(e) => e.stopPropagation()}>
            <Popover open={isPopoverOpen} onOpenChange={() => setPopoverOpen(!isPopoverOpen)} >
                <PopoverTrigger asChild>
                    <div>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="group-hover/addressItem:underline hover:text-secondary-text transition duration-200 no-underline flex gap-1 items-center cursor-default">
                                    <p className="block text-sm font-medium">
                                        {shortenAddress(address)}
                                    </p>
                                    <ChevronDown className="invisible group-hover/addressItem:visible h-4 w-4" />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                                <p>{address}</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </PopoverTrigger>
                <PopoverContent className="w-full p-2 flex flex-col gap-1 items-stretch" side="top">
                    <div onClick={(e) => { e.stopPropagation(), setCopied(address) }} className="hover:text-primary-text px-2 py-1.5 hover:bg-secondary-600 rounded transition-all duartion-200 flex items-center justify-between gap-5 w-full">
                        <p>
                            Copy address
                        </p>
                        {
                            isCopied ?
                                <Check className="h-4 w-4" />
                                : <Copy className="w-4 h-4" />
                        }
                    </div>
                    <Link href={network?.account_explorer_template?.replace('{0}', address)} target="_blank" className="hover:text-primary-text px-2 py-1.5 hover:bg-secondary-600 rounded transition-all duartion-200 flex items-center justify-between gap-5 w-full">
                        <p>
                            Open in explorer
                        </p>
                        <ExternalLink className="w-4 h-4" />
                    </Link>
                </PopoverContent>
            </Popover>
        </div>
    )
}

export default AddressWithIcon