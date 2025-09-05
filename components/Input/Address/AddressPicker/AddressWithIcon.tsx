import { FC, useState } from "react"
import { AddressGroup, AddressItem } from ".";
import AddressIcon from "@/components//AddressIcon";
import shortenAddress from "@/components//utils/ShortenAddress";
import { History, Copy, Check, ChevronDown, WalletIcon, Pencil, Link2, SquareArrowOutUpRight, Unplug, Info } from "lucide-react";
import { Partner } from "@/Models/Partner";
import { Network } from "@/Models/Network";
import { Popover, PopoverContent, PopoverTrigger } from "@/components//shadcn/popover";
import useCopyClipboard from "@/hooks/useCopyClipboard";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components//shadcn/tooltip";
import { Wallet } from "@/Models/WalletProvider";
import { ImageWithFallback } from "@/components/Common/ImageWithFallback";

type Props = {
    addressItem: AddressItem;
    connectedWallet?: Wallet | undefined;
    partner?: Partner;
    network: Network;
    balance?: { amount: number, symbol: string, isLoading: boolean } | undefined;
    onDisconnect?: ExtendedAddressProps['onDisconnect']
}

const AddressWithIcon: FC<Props> = ({ addressItem, connectedWallet, partner, network, balance, onDisconnect }) => {

    const difference_in_days = addressItem?.date ? Math.round(Math.abs(((new Date()).getTime() - new Date(addressItem.date).getTime()) / (1000 * 3600 * 24))) : undefined
    const maxWalletNameWidth = calculateMaxWidth(String(balance?.amount));

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
            text: <p className={`${maxWalletNameWidth} text-ellipsis sm:max-w-full text-nowrap overflow-hidden text-[10px]`}>{connectedWallet?.displayName || 'Connected wallet'}</p>,
            icon: connectedWallet?.icon || WalletIcon
        },
        {
            group: AddressGroup.FromQuery,
            text: <p><span>Autofilled</span> <span>{partner ? `by ${partner.display_name}` : 'from URL'}</span></p>,
            icon: Link2
        }
    ]

    const itemDescription = descriptions.find(d => d.group === addressItem.group)

    return (
        <div className="w-full flex items-center justify-between">
            <div className="flex bg-secondary-400 text-primary-text items-center justify-center rounded-md h-8 overflow-hidden w-8">
                {
                    (partner?.is_wallet && addressItem.group === AddressGroup.FromQuery) ? (
                        partner?.logo && (
                            <ImageWithFallback
                                alt="Partner logo"
                                className="rounded-md object-contain"
                                src={partner.logo}
                                width="36"
                                height="36"
                            />
                        )
                    ) : (
                        <AddressIcon className="scale-150 h-9 w-9" address={addressItem.address} size={36} />
                    )
                }
            </div>

            <div className="flex flex-col items-start grow min-w-0 ml-3 text-sm">
                <div className="flex w-full min-w-0">
                    <ExtendedAddress address={addressItem.address} network={network} onDisconnect={onDisconnect} addressClassNames="font-normal" showDetails={true} title="USDC" description="Circle USD Coin" logoSrc="https://prodlslayerswapbridgesa.blob.core.windows.net/layerswap/currencies/arusdc.png" />
                </div>
                <div className="text-secondary-text w-full min-w-0">
                    <div className="flex items-center gap-1 text-xs">
                        {itemDescription?.icon && (
                            <itemDescription.icon className="rounded-sm shrink-0 h-3.5 w-3.5" />
                        )}
                        {itemDescription?.text}
                    </div>
                </div>
            </div>

            {balance && (
                <div className="shrink-0 text-sm text-secondary-text text-right ml-3">
                    {
                        balance.amount != undefined && !isNaN(balance.amount) ?
                            <div className="text-right text-secondary-text font-normal text-sm">
                                {
                                    balance.isLoading ?
                                        <div className='h-[14px] w-20 inline-flex bg-gray-500 rounded-xs animate-pulse' />
                                        :
                                        <>
                                            <span>{balance.amount}</span> <span>{balance.symbol}</span>
                                        </>
                                }
                            </div>
                            :
                            <></>
                    }
                </div>
            )}
        </div>
    )
}

type ExtendedAddressProps = {
    address: string;
    network?: Network;
    isForCurrency?: boolean;
    addressClassNames?: string;
    onDisconnect?: () => void;
    showDetails?: boolean;
    title?: string;
    description?: string;
    logoSrc?: string;
}

const calculateMaxWidth = (balance: string | undefined) => {
    const symbolCount = balance?.length || 0;

    if (symbolCount <= 6) {
        return '';
    } else if (symbolCount <= 12) {
        return 'max-w-[100px] mr-1';
    } else {
        return 'max-w-[50px]';
    }
};

export const ExtendedAddress: FC<ExtendedAddressProps> = ({ address, network, isForCurrency, addressClassNames, onDisconnect, showDetails = false, title, description, logoSrc }) => {
    const [isCopied, setCopied] = useCopyClipboard()
    const [isPopoverOpen, setPopoverOpen] = useState(false)

    return (
        <div onClick={(e) => e.stopPropagation()}>
            <Popover open={isPopoverOpen} onOpenChange={() => setPopoverOpen(!isPopoverOpen)} modal={true}>
                <PopoverTrigger asChild>
                    <div>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="group-hover/addressItem:underline hover:text-secondary-text transition duration-200 no-underline flex gap-1 items-center cursor-pointer">
                                    <p className={`${isForCurrency ? "text-xs self-end" : "text-sm"} block font-medium`}>
                                        {shortenAddress(address)}
                                    </p>
                                    <ChevronDown className="invisible group-hover/addressItem:visible h-4 w-4" />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                                <p>View address details</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </PopoverTrigger>
                <PopoverContent 
                    className="w-auto p-2 min-w-48 flex flex-col gap-1 items-stretch" 
                    side="top" 
                    avoidCollisions={true} 
                    collisionPadding={8}
                    sticky="always"
                >
                    {!isForCurrency && (
                        <>
                            {showDetails && (title || description) && (
                                <div className="mb-2 pt-2 flex items-center gap-3">
                                    {logoSrc ? (
                                        <ImageWithFallback
                                            src={logoSrc}
                                            alt={title || "Token logo"}
                                            height="28"
                                            width="28"
                                            loading="eager"
                                            fetchPriority="high"
                                            className="rounded-full object-contain flex-shrink-0"
                                        />
                                    ) : (
                                        <Info className="w-5 h-5 text-secondary-text flex-shrink-0" />
                                    )}
                                    <div className="flex-1">
                                        {title && <h3 className="text-sm font-semibold text-primary-text">{title}</h3>}
                                        {description && <p className="text-xs text-secondary-text font-sans">{description}</p>}
                                    </div>
                                </div>
                            )}
                            <div className="relative px-2 py-6 bg-gradient-to-b from-secondary-500 to-secondary-600 rounded-lg text-sm font-mono break-all leading-relaxed shadow-lg text-left">
                                <div className="grid grid-cols-1 gap-0 text-secondary-text tracking-wide">
                                    {Array.from({ length: Math.ceil(address.length / 15) }, (_, i) => {
                                        const start = i * 15;
                                        const end = Math.min(start + 15, address.length);
                                        const chunk = address.slice(start, end);
                                        
                                        return (
                                            <div key={i}>
                                                {i === 0 && chunk.length >= 4 ? (
                                                    <>
                                                        <span className="text-primary-text font-medium">{chunk.slice(0, 4)}</span>
                                                        {chunk.slice(4)}
                                                    </>
                                                ) : i === Math.ceil(address.length / 15) - 1 && chunk.length >= 4 ? (
                                                    <>
                                                        {chunk.slice(0, -4)}
                                                        <span className="text-primary-text font-medium">{chunk.slice(-4)}</span>
                                                    </>
                                                ) : chunk}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <div onClick={(e) => { e.stopPropagation(), setCopied(address) }} className="cursor-pointer text-secondary-text hover:text-primary-text px-2.5 py-2 bg-secondary-500 hover:bg-secondary-400 rounded transition-all duartion-200 flex items-center gap-1 flex-1 justify-center">
                                    {
                                        isCopied ?
                                            <Check className="h-3 w-3" />
                                            : <Copy className="w-3 h-3" />
                                    }
                                    <p className="text-xs whitespace-nowrap">Copy</p>
                                </div>
                                {network && (
                                    <Link href={network?.account_explorer_template?.replace('{0}', address)} target="_blank" className="cursor-pointer text-secondary-text hover:text-primary-text px-2.5 py-2 bg-secondary-500 hover:bg-secondary-400 rounded transition-all duartion-200 flex items-center gap-1 flex-1 justify-center">
                                        <SquareArrowOutUpRight className="w-3 h-3" />
                                        <p className="text-xs whitespace-nowrap">View</p>
                                    </Link>
                                )}
                                {onDisconnect && (
                                    <div onClick={(e) => { e.stopPropagation(), onDisconnect() }} className="cursor-pointer text-secondary-text hover:text-primary-text px-2.5 py-2 bg-secondary-500 hover:bg-secondary-400 rounded transition-all duartion-200 flex items-center gap-1 flex-1 justify-center">
                                        <Unplug className="w-3 h-3" />
                                        <p className="text-xs whitespace-nowrap">Disconnect</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </PopoverContent>
            </Popover>
        </div>
    )
}

export default AddressWithIcon