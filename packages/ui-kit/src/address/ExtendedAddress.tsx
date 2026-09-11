'use client'
import { NetworkType, type Network } from '@layerswap/widget-types';
import { FC, MouseEventHandler, ReactNode, SVGProps, useCallback, useMemo, useState } from "react"
import { Copy, Check, ChevronDown, Unplug, Info, SquareArrowOutUpRight, Trash2, BookmarkPlus } from "lucide-react";
import clsx from "clsx";
import { Address, getExplorerUrl, getNetworkAdapter, shortenString, useCopyClipboard, useWindowDimensions } from "@layerswap/utils";
import { Popover, PopoverContent, PopoverTrigger } from "../shadcn/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "../shadcn/tooltip";
import { ImageWithFallback } from "../common/ImageWithFallback";
import { useWalletListAdapters } from "@/lib/adapters";

type ExtendedAddressBaseProps = {
    address: string;
    isForCurrency?: boolean;
    addressClassNames?: string;
    onDisconnect?: () => void;
    onRemove?: () => void;
    showDetails?: boolean;
    title?: string;
    description?: string;
    logo?: string;
    children?: ReactNode
    shouldShowChevron?: boolean
    onPopoverOpenChange?: (open: boolean) => void;
    onTooltipOpenChange?: (open: boolean) => void;
    /** When provided, the popover Save button calls this instead of showing the inline name form for saving address to address book. */
    onSaveRequest?: () => void;
}
type ExtendedAddressProps = ExtendedAddressBaseProps
    & { network?: Network, providerName?: string }

export const ExtendedAddress: FC<ExtendedAddressProps> = ({ address, network, providerName, isForCurrency, children, onDisconnect, onRemove, showDetails = false, title, description, logo: Logo, onPopoverOpenChange, onTooltipOpenChange, shouldShowChevron = true, onSaveRequest }) => {
    if (!network && !providerName) {
        return children ?? <p className="text-sm block font-medium text-secondary-text">
            {shortenString(address)}
        </p>
    }
    return <AddressDetailsPopover address={address} network={network!} providerName={providerName!} isForCurrency={isForCurrency} onDisconnect={onDisconnect} onRemove={onRemove} showDetails={showDetails} title={title} description={description} logo={Logo} onPopoverOpenChange={onPopoverOpenChange} onTooltipOpenChange={onTooltipOpenChange} shouldShowChevron={shouldShowChevron} onSaveRequest={onSaveRequest}>{children}</AddressDetailsPopover>
}
type AddressDetailsPopoverProps = ExtendedAddressBaseProps
    & ({ network: Network, providerName?: string } | { network?: Network, providerName: string })

const AddressDetailsPopover: FC<AddressDetailsPopoverProps> = ({ address, network, providerName, isForCurrency, children, onDisconnect, onRemove, showDetails = false, title, description, logo: Logo, onPopoverOpenChange, onTooltipOpenChange, shouldShowChevron = true, onSaveRequest }) => {
    const adapters = useWalletListAdapters()
    const [isCopied, setCopied] = useCopyClipboard()
    const [isPopoverOpen, setPopoverOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const { isMobile } = useWindowDimensions()

    const handlePopoverChange = (open: boolean) => {
        setPopoverOpen(open)
        if (!open) setSaving(false)
        onPopoverOpenChange?.(open)
    }

    const addr = useMemo(() =>
        new Address(address, network ?? null, providerName!),
        [address, network, providerName]
    );

    const { name: displayName, labeled: labeledAddress } = adapters.useAddressLabel(address, network, providerName)

    const isAddressValid = useMemo(() => {
        if (network) {
            return Address.isValid(addr.full, network)
        }
        return false
    }, [addr.full, network]);

    const saveNetworkType = network?.type ?? (providerName ? providerName.toLowerCase() as NetworkType : undefined)
    const canSave = !isForCurrency && !displayName && !!saveNetworkType && (!!onSaveRequest || !!adapters.renderSaveForm)

    // Resolver for action buttons
    const getActionButtons = useCallback(() => {

        const buttons: ActionButtonProps[] = [
            {
                title: 'Copy',
                Icon: isCopied ? Check : Copy,
                onClick: (e: React.MouseEvent<HTMLDivElement>) => { e.stopPropagation(); setCopied(addr.normalized); }
            },
            ...((network && isAddressValid) ? [{
                title: 'View',
                Icon: SquareArrowOutUpRight,
                href: getExplorerUrl(getNetworkAdapter()?.getAccountExplorerUrl(network) ?? network.account_explorer_template, addr.full)
            }] : []),
            ...(canSave && !saving ? [{
                title: 'Save',
                Icon: BookmarkPlus,
                onClick: (e: React.MouseEvent<HTMLDivElement>) => { e.stopPropagation(); if (onSaveRequest) { setPopoverOpen(false); onSaveRequest(); } else { setSaving(true); } }
            }] : []),
            ...(onDisconnect ? [{
                title: 'Disconnect',
                Icon: Unplug,
                iconClassNames: 'text-red-400',
                onClick: (e: React.MouseEvent<HTMLDivElement>) => { e.stopPropagation(); setPopoverOpen(false); onDisconnect(); }
            }] : []),
            ...(onRemove ? [{
                title: 'Remove',
                Icon: Trash2,
                iconClassNames: 'text-red-400',
                onClick: (e: React.MouseEvent<HTMLDivElement>) => { e.stopPropagation(); setPopoverOpen(false); onRemove(); }
            }] : [])
        ];

        const showTitles = buttons.length <= 2;

        return { buttons, showTitles };
    }, [addr.full, network, providerName, isAddressValid, isCopied, onDisconnect, onRemove, canSave, saving, onSaveRequest]);

    const { buttons, showTitles } = getActionButtons();
    const { start, middle, end } = useMemo(() => addr.toEmphasizedParts(), [addr]);

    return (
        <div onClick={(e) => e.stopPropagation()}>
            <Popover open={isPopoverOpen} onOpenChange={handlePopoverChange}>
                <PopoverTrigger asChild>
                    <div>
                        <Tooltip onOpenChange={onTooltipOpenChange}>
                            <TooltipTrigger asChild>
                                <span className={isForCurrency ? "block w-full min-w-0" : undefined}>
                                    {
                                        children ??
                                        <div className="hover:text-secondary-text transition duration-200 flex gap-1 items-center cursor-pointer min-w-0">
                                            <p className={`${isForCurrency ? "text-xs self-end" : "text-sm"} block font-medium group-hover/addressItem:underline ${displayName ? 'min-w-0 max-w-[260px] truncate' : ''}`}>
                                                {labeledAddress}
                                            </p>
                                            {shouldShowChevron ?
                                                <ChevronDown className="invisible group-hover/addressItem:visible h-4 w-4 shrink-0" />
                                                : null
                                            }
                                        </div>
                                    }
                                </span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="pointer-events-none">
                                <p>{isForCurrency ? "View token details" : "View address details"}</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </PopoverTrigger>
                <PopoverContent
                    container={isMobile ? (document.querySelector("[data-vaul-drawer]") as HTMLElement | null) : undefined}
                    className="w-auto p-3 min-w-72 flex flex-col gap-3 items-stretch rounded-2xl! bg-secondary-500!"
                    side="top"
                    avoidCollisions={true}
                    collisionPadding={8}
                    sticky="always"
                    onInteractOutside={(e) => {
                        e.detail.originalEvent.stopPropagation()
                    }}
                    onPointerDownOutside={(e) => {
                        e.detail.originalEvent.stopPropagation()
                    }}
                >
                    {showDetails && (title || description) && (
                        <div>
                            <div className="flex items-center gap-3">
                                {Logo ? (
                                    <ImageWithFallback
                                        src={Logo}
                                        alt={title || "Token logo"}
                                        height="40"
                                        width="40"
                                        loading="eager"
                                        fetchPriority="high"
                                        className="rounded-full object-contain shrink-0 h-10 w-10"
                                    />
                                ) : (
                                    <Info className="w-10 h-10 text-secondary-text shrink-0" />
                                )}
                                <div className="flex-1 font-medium">
                                    {title && <h3 className="text-base leading-5 text-primary-text">{title}</h3>}
                                    {description && <p className="text-sm leading-4.5 text-secondary-text">{description}</p>}
                                </div>
                            </div>
                            <hr className="border rounded-full border-secondary-400 mt-2" />
                        </div>

                    )}
                    {displayName && displayName !== title && (
                        <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-left">
                            <span className="text-xs text-secondary-text shrink-0">Saved as:</span>
                            <span className="text-primary-text text-sm font-medium break-words min-w-0">{displayName}</span>
                        </div>
                    )}
                    <p className="text-secondary-text text-sm leading-5 break-all text-left font-mono">
                        <><span className="text-primary-text font-medium">{start}</span><span>{middle}</span><span className="text-primary-text font-medium">{end}</span></>
                    </p>
                    <div className="space-y-1.5">
                        <div className="flex gap-3">
                            {buttons.map((button) => (
                                <ActionButton
                                    key={button.title}
                                    showTitle={showTitles}
                                    {...button}
                                />
                            ))}
                        </div>
                        {saving && saveNetworkType && !onSaveRequest && adapters.renderSaveForm?.({ address, network: { name: network?.name, type: saveNetworkType }, onDone: () => setSaving(false) })}
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
                <a
                    href={href}
                    target="_blank"
                    className={buttonClasses}
                    rel="noopener noreferrer"
                >
                    {children}
                </a>
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
