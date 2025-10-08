import { FC, MouseEventHandler, ReactNode, SVGProps, useState } from "react"
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
import { ImageWithFallback } from "@/components/Common/ImageWithFallback";
import clsx from "clsx";

type Props = {
    addressItem: AddressItem;
    partner?: Partner;
    network?: Network;
    balance?: { amount: number, symbol: string, isLoading: boolean } | undefined;
    onDisconnect?: ExtendedAddressProps['onDisconnect']
}

const AddressWithIcon: FC<Props> = ({ addressItem, partner, network, balance, onDisconnect }) => {

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
            text: <p className={`${maxWalletNameWidth} text-ellipsis sm:max-w-full text-nowrap overflow-hidden text-[10px]`}>{addressItem.wallet?.displayName || 'Connected wallet'}</p>,
            icon: addressItem.wallet?.icon || WalletIcon
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
                    <ExtendedAddress address={addressItem.address} network={network} onDisconnect={onDisconnect} addressClassNames="font-normal" showDetails={true} title="USDC" description="Circle USD Coin" logo="https://prodlslayerswapbridgesa.blob.core.windows.net/layerswap/currencies/arusdc.png" />
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
    logo?: string | ((e: SVGProps<SVGSVGElement>) => ReactNode);
    children?: ReactNode
    shouldShowChevron?: boolean
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

export const ExtendedAddress: FC<ExtendedAddressProps> = ({ address, network, isForCurrency, children, onDisconnect, showDetails = false, title, description, logo: Logo, shouldShowChevron = true }) => {
    const [isCopied, setCopied] = useCopyClipboard()
    const [isPopoverOpen, setPopoverOpen] = useState(false)

    // Resolver for action buttons
    const getActionButtons = () => {
        const buttons: ActionButtonProps[] = [
            {
                title: 'Copy',
                Icon: isCopied ? Check : Copy,
                onClick: (e: React.MouseEvent<HTMLDivElement>) => { e.stopPropagation(); setCopied(address); }
            },
            ...(network ? [{
                title: 'View',
                Icon: SquareArrowOutUpRight,
                href: network.account_explorer_template?.replace('{0}', address)
            }] : []),
            ...(onDisconnect ? [{
                title: 'Disconnect',
                Icon: Unplug,
                iconClassNames: 'text-red-400',
                onClick: (e: React.MouseEvent<HTMLDivElement>) => { e.stopPropagation(); setPopoverOpen(false); onDisconnect(); }
            }] : [])
        ];

        const showTitles = buttons.length <= 2;

        return { buttons, showTitles };
    }

    const { buttons, showTitles } = getActionButtons();

    return (
        <div onClick={(e) => e.stopPropagation()}>
            <Popover open={isPopoverOpen} onOpenChange={() => setPopoverOpen(!isPopoverOpen)} modal={true}>
                <PopoverTrigger asChild>
                    <div>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                {
                                    children ??
                                    <div className="group-hover/addressItem:underline hover:text-secondary-text transition duration-200 no-underline flex gap-1 items-center cursor-pointer">
                                        <p className={`${isForCurrency ? "text-xs self-end" : "text-sm"} block font-medium`}>
                                            {shortenAddress(address)}
                                        </p>
                                        {shouldShowChevron ?
                                            <ChevronDown className="invisible group-hover/addressItem:visible h-4 w-4" />
                                            : null
                                        }
                                    </div>
                                }
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                                <p>{isForCurrency ? "View token details" : "View address details"}</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </PopoverTrigger>
                <PopoverContent
                    className="w-auto p-3 min-w-72 flex flex-col gap-3 items-stretch !rounded-2xl !bg-secondary-500"
                    side="top"
                    avoidCollisions={true}
                    collisionPadding={8}
                    sticky="always"
                >
                    {showDetails && (title || description) && (
                        <div>
                            <div className="flex items-center gap-3">
                                {Logo ?

                                    typeof Logo == 'string' ? (
                                        <ImageWithFallback
                                            src={Logo}
                                            alt={title || "Token logo"}
                                            height="40"
                                            width="40"
                                            loading="eager"
                                            fetchPriority="high"
                                            className="rounded-full object-contain flex-shrink-0 h-10 w-10"
                                        />
                                    ) : (
                                        <Logo className="w-10 h-10 text-secondary-text flex-shrink-0" />
                                    ) : (
                                        <Info className="w-10 h-10 text-secondary-text flex-shrink-0" />
                                    )}
                                <div className="flex-1 font-medium">
                                    {title && <h3 className="text-base leading-5 text-primary-text">{title}</h3>}
                                    {description && <p className="text-sm leading-[18px] text-secondary-text">{description}</p>}
                                </div>
                            </div>
                            <hr className="border rounded-full border-secondary-400 mt-2" />
                        </div>

                    )}
                    <p className="text-secondary-text text-sm leading-5 font-mono break-all text-left">
                        <span className="text-primary-text font-medium">{address.slice(0, 4)}</span><span>{address.slice(4, -4)}</span><span className="text-primary-text font-medium">{address.slice(-4)}</span>
                    </p>
                    <div className="flex gap-3">
                        {buttons.map((button) => (
                            <ActionButton
                                key={button.title}
                                showTitle={showTitles}
                                {...button}
                            />
                        ))}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}

type ActionButtonProps = {
    title: string,
    Icon: (props: SVGProps<SVGSVGElement>) => ReactNode,
    iconClassNames?: string,
    onClick?: MouseEventHandler<HTMLDivElement> | undefined,
    href?: string,
    showTitle?: boolean
}

const ActionButton: FC<ActionButtonProps> = ({ title, Icon, onClick, href, iconClassNames, showTitle = true }) => {
    const [showTooltip, setShowTooltip] = useState(false)
    const children = (
        <>
            <Icon className={clsx("h-3 w-3", iconClassNames)} />
            {showTitle && <p className="text-xs whitespace-nowrap">{title}</p>}
        </>
    )

    const buttonClasses = "cursor-pointer text-secondary-text hover:text-primary-text px-2.5 py-2 bg-secondary-300 hover:bg-secondary-400 rounded-lg transition-all duration-200 flex items-center gap-1 flex-1 justify-center"

    const renderButton = () => {
        if (href) {
            return (
                <Link
                    href={href}
                    target="_blank"
                    className={buttonClasses}

                >
                    {children}
                </Link>
            )
        }

        return (
            <div
                onClick={onClick}
                className={buttonClasses}

            >
                {children}
            </div>
        )
    }

    if (showTitle) {
        return renderButton()
    }

    return (
        <Tooltip disableHoverableContent key={title} open={showTooltip} onOpenChange={setShowTooltip}>
            <TooltipTrigger asChild>
                {renderButton()}
            </TooltipTrigger>
            <TooltipContent key={title} side="top">
                <p>{title}</p>
            </TooltipContent>
        </Tooltip>
    )
}

export default AddressWithIcon