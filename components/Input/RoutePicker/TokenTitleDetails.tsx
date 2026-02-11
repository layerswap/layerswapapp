import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import { Info } from "lucide-react";
import { ExtendedAddress } from "../Address/AddressPicker/AddressWithIcon";
import { formatUsd } from "@/components/utils/formatUsdAmount";
import { TokenBalance } from "@/Models/Balance";
import { useState } from "react";
import clsx from "clsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components//shadcn/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components//shadcn/tooltip";
import { ImageWithFallback } from "@/components/Common/ImageWithFallback";

type TokenTitleWithBalanceProps = {
    item: NetworkRouteToken;
    route: NetworkRoute;
    tokenbalance?: TokenBalance;
    usdAmount?: number;
}

export const TokenInfoIcon = ({ item, route, className }: { item: NetworkRouteToken, route: NetworkRoute, className?: string }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [isTooltipOpen, setIsTooltipOpen] = useState(false);

    return (
        <div className={className} data-popover-open={isPopoverOpen} data-tooltip-open={isTooltipOpen}>
            {item.contract ? (
                <ExtendedAddress
                    network={item.contract ? route : undefined}
                    isForCurrency
                    showDetails
                    address={item.contract}
                    logo={item.logo}
                    title={item.symbol}
                    description={item.display_asset}
                    onPopoverOpenChange={setIsPopoverOpen}
                    onTooltipOpenChange={setIsTooltipOpen}
                >
                    <TokenInfoTrigger item={item} isPopoverOpen={isPopoverOpen} isTooltipOpen={isTooltipOpen} />
                </ExtendedAddress>
            ) : (
                <NativeTokenTitle item={item} route={route} isPopoverOpen={isPopoverOpen} isTooltipOpen={isTooltipOpen} />
            )}
        </div>
    );
};

export const TokenTitleWithBalance = ({ item, route, tokenbalance, usdAmount }: TokenTitleWithBalanceProps) => {
    return (
        <div className="flex items-center gap-2 justify-between w-full">
            <div className="flex items-center gap-2">
                <p>
                    {item.symbol}
                </p>
                <TokenInfoIcon
                    item={item}
                    route={route}
                    className="hidden xs:block transition-all duration-300 opacity-0 group-hover:opacity-100 data-[popover-open=true]:opacity-100 data-[tooltip-open=true]:opacity-100 data-[popover-open=true]:delay-0 data-[tooltip-open=true]:delay-0 group-hover:delay-400 click-delay-on-hover pointer-events-none group-hover:pointer-events-auto data-[popover-open=true]:pointer-events-auto data-[tooltip-open=true]:pointer-events-auto"
                />
            </div>
            {(tokenbalance && Number(tokenbalance?.amount) > 0 && Number(usdAmount) > 0) && (
                <div className="text-primary-text text-lg leading-[22px] font-medium">{formatUsd(usdAmount)}</div>
            )}
        </div>
    );
};
type TokenInfoTriggerProps = {
    item: NetworkRouteToken;
    isPopoverOpen?: boolean;
    isTooltipOpen?: boolean;
}
const TokenInfoTrigger = ({ item, isPopoverOpen, isTooltipOpen }: TokenInfoTriggerProps) => {
    return (
        <div className={'flex items-center gap-1 text-secondary-text cursor-pointer hover:text-primary-text data-[popover-open=true]:text-primary-text data-[tooltip-open=true]:text-primary-text text-xs'} data-popover-open={isPopoverOpen} data-tooltip-open={isTooltipOpen}>
            <p className="max-w-[90px] truncate">
                <span>•</span> <span>{item.display_asset || item.symbol}</span>
            </p>
            <Info className="h-3 w-3" />
        </div>
    )
}

type NativeTokenTitleProps = {
    item: NetworkRouteToken;
    route: NetworkRoute;
    onTooltipOpenChange?: (open: boolean) => void;
    iconOnly?: boolean;
    isPopoverOpen?: boolean;
    isTooltipOpen?: boolean;
}

const NativeTokenTitle = ({ item, route, onTooltipOpenChange, isTooltipOpen }: NativeTokenTitleProps) => {
    const [isPopoverOpen, setPopoverOpen] = useState(false)
    const handlePopoverChange = (open: boolean) => {
        setPopoverOpen(open)
    }

    return (
        <div onClick={(e) => e.stopPropagation()}>
            <Popover open={isPopoverOpen} onOpenChange={handlePopoverChange} modal={true}>
                <PopoverTrigger asChild>
                    <div>
                        <Tooltip onOpenChange={onTooltipOpenChange}>
                            <TooltipTrigger asChild>
                                <TokenInfoTrigger
                                    item={item}
                                    isPopoverOpen={isPopoverOpen}
                                    isTooltipOpen={isTooltipOpen}
                                />
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="pointer-events-none">
                                <p>View token details</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </PopoverTrigger>
                <PopoverContent
                    className="w-auto p-3 min-w-72 flex flex-col gap-3 items-stretch rounded-2xl! bg-secondary-500!"
                    side="top"
                    avoidCollisions={true}
                    collisionPadding={8}
                    sticky="always"
                >
                    <div>
                        <div className="flex items-center gap-3">
                            <ImageWithFallback
                                src={item.logo}
                                alt={item.symbol}
                                height="40"
                                width="40"
                                loading="eager"
                                fetchPriority="high"
                                className="rounded-full object-contain shrink-0 h-10 w-10"
                            />
                            <div className="flex-1 font-medium">
                                <h3 className="text-base leading-5 text-primary-text">{item.symbol}</h3>
                                <p className="text-sm leading-[18px] text-secondary-text">{item.display_asset}</p>
                            </div>
                        </div>
                        <hr className="border rounded-full border-secondary-400 mt-2" />
                    </div>

                    <p className="text-secondary-text text-sm leading-5 break-all text-left font-mono">
                        {route.display_name} <span>{item.symbol}</span> native coin
                    </p>
                </PopoverContent>
            </Popover>
        </div>
    );
};
