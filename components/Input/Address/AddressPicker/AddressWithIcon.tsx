import { FC } from "react"
import { AddressGroup, AddressItem } from ".";
import AddressIcon from "../../../AddressIcon";
import shortenAddress from "../../../utils/ShortenAddress";
import { MessageCircleWarning, History, ExternalLink, Copy, Check, ChevronDown } from "lucide-react";
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

    const difference_in_days = addressItem?.date ? Math.round(Math.abs(((new Date()).getTime() - new Date(addressItem.date).getTime()) / (1000 * 3600 * 24))) : undefined
    const [isCopied, setCopied] = useCopyClipboard()

    return (
        <div className={`flex gap-3 text-sm items-center`}>
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
                                    height="36"></Image>
                            }
                        </div>
                        :
                        <AddressIcon className="scale-150 h-9 w-9" address={addressItem.address} size={36} />
                }
            </div>
            <div className="flex flex-col items-start">
                <Popover>
                    <PopoverTrigger onClick={(e) => e.stopPropagation()}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="group-hover/addressItem:underline hover:text-secondary-text transition duration-200 no-underline flex gap-1 items-center">
                                    <p className="block text-sm font-medium">
                                        {shortenAddress(addressItem.address)}
                                    </p>
                                    <ChevronDown className="invisible group-hover/addressItem:visible h-4 w-4" />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                                <p>{addressItem.address}</p>
                            </TooltipContent>
                        </Tooltip>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-2 flex flex-col gap-1 items-stretch" side="top">
                        <button type="button" onClick={(e) => { e.stopPropagation(), setCopied(addressItem.address) }} className="hover:text-primary-text px-2 py-1.5 hover:bg-secondary-600 rounded transition-all duartion-200 flex items-center justify-between gap-5 w-full">
                            <p>
                                Copy address
                            </p>
                            {
                                isCopied ?
                                    <Check className="h-4 w-4" />
                                    : <Copy className="w-4 h-4" />
                            }
                        </button>
                        <Link href={destination?.account_explorer_template?.replace('{0}', addressItem.address)} target="_blank" onClick={(e) => { e.stopPropagation(), setCopied(addressItem.address) }} className="hover:text-primary-text px-2 py-1.5 hover:bg-secondary-600 rounded transition-all duartion-200 flex items-center justify-between gap-5 w-full">
                            <p>
                                Open in explorer
                            </p>
                            <ExternalLink className="w-4 h-4" />
                        </Link>
                    </PopoverContent>
                </Popover>

                <div className="text-secondary-text">
                    {
                        addressItem.group === AddressGroup.RecentlyUsed &&
                        <div className="inline-flex items-center gap-1">
                            <History className="h-3 w-3" />
                            {
                                (difference_in_days === 0 ?
                                    <p>Used today</p>
                                    :
                                    (difference_in_days && difference_in_days > 1 ?
                                        <p><span>Used</span> {difference_in_days} <span>days ago</span></p>
                                        : <p>Used yesterday</p>))
                            }
                        </div>
                    }
                    {
                        addressItem.group === AddressGroup.ManualAdded &&
                        <div className="inline-flex items-center gap-1">
                            <MessageCircleWarning className="h-3 w-3" />
                            <p>New Address</p>
                        </div>
                    }
                    {
                        addressItem.group === AddressGroup.ConnectedWallet && connectedWallet?.connector &&
                        <div className="flex items-center gap-1.5 text-secondary-text text-sm">
                            <connectedWallet.icon className="rounded flex-shrink-0 h-4 w-4" />
                            <p>
                                {connectedWallet.connector}
                            </p>
                        </div>
                    }
                    {
                        addressItem.group === AddressGroup.FromQuery && partner &&
                        <div className="flex items-center gap-1.5 text-secondary-text text-sm">
                            <p>
                                {partner.display_name}
                            </p>
                        </div>
                    }
                </div>
            </div>
        </div>
    )
}

export default AddressWithIcon