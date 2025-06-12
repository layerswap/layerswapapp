import { NetworkRoute, NetworkRouteToken } from "../../../../Models/Network";
import useWallet from "../../../../hooks/useWallet";
import { SwapDirection } from "../../../DTOs/SwapFormValues";
import { truncateDecimals } from "../../../utils/RoundDecimals";
import Image from 'next/image'
import { SelectItem } from "../../../Select/CommandNew/SelectItem/Index";
import { Exchange } from "../../../../Models/Exchange";
import { Route, RouteToken } from "../../../../Models/Route";
import { ChevronDown } from "lucide-react";
import RoutePickerIcon from "../../../icons/RoutePickerPlaceholder";
import { useBalance } from "../../../../lib/balances/providers/useBalance";

type TokenItemProps = {
    route: Route;
    item: RouteToken;
    selected: boolean;
    direction: SwapDirection;
    allbalancesLoaded: boolean;
}

export const CurrencySelectItemDisplay = (props: TokenItemProps) => {
    const { item, route, direction, allbalancesLoaded } = props

    return <SelectItem>
        <SelectItem.Logo
            imgSrc={item.logo}
            altText={`${item.symbol} logo`}
            className="rounded-full"
        />
        {
            route.cex ?
                <SelectItem.DetailedTitle title={item.symbol} secondary={route.display_name} />
                :
                <NetworkTokenTitle item={item as NetworkRouteToken} route={route} direction={direction} allbalancesLoaded={allbalancesLoaded} />
        }
    </SelectItem>
}
type NetworkTokenItemProps = {
    route: NetworkRoute;
    item: NetworkRouteToken;
    direction: SwapDirection;
    allbalancesLoaded: boolean;
}
export const NetworkTokenTitle = (props: NetworkTokenItemProps) => {
    const { item, route, direction, allbalancesLoaded } = props
    const { provider } = useWallet(route, direction === "from" ? "withdrawal" : "autofil")
    const activeAddress = provider?.activeWallet
    const { balances } = useBalance(activeAddress?.address, route)
    const tokenbalance = balances?.find(b => b.token === item.symbol)
    const formatted_balance_amount = tokenbalance?.amount ? truncateDecimals(tokenbalance?.amount, item.precision) : ''
    const balanceAmountInUsd = (item?.price_in_usd * Number(formatted_balance_amount)).toFixed(2)

    return <SelectItem.DetailedTitle title={item.symbol} secondary={route.display_name} secondaryLogoSrc={route.logo}>
        {
            (allbalancesLoaded && tokenbalance && Number(formatted_balance_amount) > 0) ? (
                <span className="text-sm text-secondary-text text-right my-auto leading-4 font-medium">
                    <div className="text-primary-text"> {formatted_balance_amount}</div>
                    {Number(tokenbalance?.amount) > 0 && <div>${balanceAmountInUsd}</div>}
                </span>
            ) : <></>}
    </SelectItem.DetailedTitle>
}


type RouteItemProps = {
    item: Route;
    selected: boolean;
    direction: SwapDirection;
    allbalancesLoaded: boolean;
}

export const RouteSelectItemDisplay = (props: RouteItemProps) => {
    const { item, selected, direction, allbalancesLoaded } = props

    return item.cex ? <ExchangeRouteSelectItemDisplay item={item} selected={selected} />
        : <NetworkRouteSelectItemDisplay item={item} selected={selected} direction={direction} allbalancesLoaded={allbalancesLoaded} />
}

type NetworkRouteItemProps = {
    item: NetworkRoute;
    selected: boolean;
    direction: SwapDirection;
    allbalancesLoaded: boolean;
}

const NetworkRouteSelectItemDisplay = (props: NetworkRouteItemProps) => {
    const { item, direction, allbalancesLoaded } = props
    const { provider } = useWallet(item, direction === "from" ? "withdrawal" : "autofil")
    const activeWallet = provider?.activeWallet

    const { balances, totalInUSD } = useBalance(activeWallet?.address, item)
    const tokensWithBalance = balances?.filter(b => b.amount > 0)
        ?.map(b => b.token);
    const filteredNetworkTokens = item?.tokens?.filter(token =>
        tokensWithBalance?.includes(token.symbol)
    );

    return (
        <SelectItem className="bg-secondary-500 group rounded-xl hover:bg-secondary-400 group/item relative pr-7">
            <SelectItem.Logo imgSrc={item.logo} altText={`${item.display_name} logo`} />
            <SelectItem.Title className="py-3" >
                <>
                    <span>{item.display_name}</span>
                    {
                        Number(totalInUSD) >= 0 && allbalancesLoaded &&
                        <div className={`${filteredNetworkTokens?.length > 0 ? "flex flex-col space-y-0.5" : ""}`}>
                            <span className="text-secondary-text text-sm leading-4 font-medium">{<span>${totalInUSD?.toFixed(2)}</span>}</span>
                            {filteredNetworkTokens?.length > 0
                                ? (
                                    <div className="flex justify-end items-stretch w-full relative">
                                        {filteredNetworkTokens?.map(
                                            (t, index) => (
                                                <div
                                                    key={t.symbol}
                                                    className="w-3.5 absolute"
                                                    style={{ right: `${index * 20}%` }}
                                                >
                                                    <Image
                                                        src={t.logo}
                                                        alt={`${t.symbol} logo`}
                                                        height="16"
                                                        width="16"
                                                        loading="eager"
                                                        fetchPriority='high'
                                                        className="rounded-full object-contain"
                                                    />
                                                </div>
                                            )
                                        )}
                                    </div>
                                ) : null}
                        </div>
                    }
                    <ChevronDown
                        className="!w-3.5 !h-3.5 absolute right-2 bottom-4 text-secondary-text transition-opacity duration-200 opacity-0 group-hover/item:opacity-100"
                        aria-hidden="true"
                    />
                </>
            </SelectItem.Title>
        </SelectItem>
    )
}
type ExchangeRouteItemProps = {
    item: Exchange;
    selected: boolean;
}

const ExchangeRouteSelectItemDisplay = (props: ExchangeRouteItemProps) => {
    const { item } = props

    return (
        <SelectItem className="bg-secondary-500 group rounded-xl hover:bg-secondary-400 group/item relative">
            <SelectItem.Logo imgSrc={item.logo} altText={`${item.display_name} logo`} />
            <SelectItem.Title className="py-3" >
                <>
                    <span>{item.display_name}</span>
                    <ChevronDown
                        className="!w-3.5 !h-3.5 absolute right-2 bottom-4 text-secondary-text transition-opacity duration-200 opacity-0 group-hover/item:opacity-100"
                        aria-hidden="true"
                    />
                </>
            </SelectItem.Title>
        </SelectItem>
    )
}

type SelectedCurrencyDisplayProps = {
    value: {
        logo: string
        symbol: string
    } | undefined;
    placeholder: string;
}

export const SelectedCurrencyDisplay = (props: SelectedCurrencyDisplayProps) => {
    const { value, placeholder } = props
    return <span className='flex flex-col text-left items-center text-xs md:text-base'>
        {
            value?.logo && <div className="flex items-center">
                <div className="shrink-0 h-6 w-6 relative">
                    <Image
                        src={value.logo}
                        alt="Project Logo"
                        height="40"
                        width="40"
                        loading="eager"
                        fetchPriority='high'
                        className="rounded-full object-contain"
                    />
                </div>
            </div>
        }
        {value ?
            <span className="ml-3 flex font-medium flex-auto space-x-1 text-primary-buttonTextColor items-center">
                {value.symbol}
            </span>
            :
            <span className="block font-medium text-primary-text-placeholder flex-auto items-center">
                {placeholder}
            </span>
        }
    </span>
}

type SelectedRouteDisplayProps = {
    route?: NetworkRoute | Exchange;
    token?: RouteToken;
    placeholder: string;
}

export const SelectedRouteDisplay = ({ route, token, placeholder }: SelectedRouteDisplayProps) => {
    const showContent = token && route;

    return (
        <span className="flex grow text-left items-center text-xs md:text-base relative">
            {showContent ? (
                <>
                    <div className="inline-flex items-center relative shrink-0">
                        <Image
                            src={token.logo}
                            alt="Token Logo"
                            height="20"
                            width="20"
                            loading="eager"
                            fetchPriority="high"
                            className="rounded-full object-contain"
                        />
                        <Image
                            src={route.logo}
                            alt="Route Logo"
                            height="14"
                            width="14"
                            loading="eager"
                            fetchPriority="high"
                            className="h-3.5 w-3.5 absolute -right-1.5 -bottom-1.5 object-contain rounded-md border-1 border-secondary-300"
                        />
                    </div>
                    <span className="group-has-[.input-wide]:hidden ml-2 flex flex-col font-medium text-primary-buttonTextColor overflow-hidden min-w-0 max-w-3/5">
                        <span className="leading-5">{token.symbol}</span>
                        <span className="text-secondary-text text-sm leading-4 truncate whitespace-nowrap">
                            {route.display_name}
                        </span>
                    </span>
                </>
            ) : (
                <SelectedRoutePlaceholder placeholder={placeholder} />
            )}
            <span className="group-has-[.input-wide]:static absolute right-0 pr-2 pl-1 pointer-events-none text-primary-text">
                <ChevronDown className="h-3.5 w-3.5 text-secondary-text" aria-hidden="true" />
            </span>
        </span>
    )
}

const SelectedRoutePlaceholder = ({ placeholder }: { placeholder: string }) => (
    <>
        <div className="inline-flex items-center relative">
            <RoutePickerIcon className="w-7 h-7" />
        </div>
        <span className="group-has-[.input-wide]:hidden flex text-secondary-text text-base font-normal leading-5 flex-auto items-center max-w-2/3">
            <span className="ml-2">{placeholder}</span>
        </span>
    </>
)