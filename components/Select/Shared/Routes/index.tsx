import { NetworkRoute, NetworkRouteToken } from "../../../../Models/Network";
import useWallet from "../../../../hooks/useWallet";
import useSWRBalance from "../../../../lib/balances/useSWRBalance";
import { SwapDirection } from "../../../DTOs/SwapFormValues";
import { truncateDecimals } from "../../../utils/RoundDecimals";
import Image from 'next/image'
import { SelectItem } from "../../CommandNew/SelectItem/Index";
import { useMemo } from "react";
import { Exchange } from "../../../../Models/Exchange";
import { Route, RouteToken } from "../../../../Models/Route";

type TokenItemProps = {
    route: Route;
    item: RouteToken;
    selected: boolean;
    direction: SwapDirection;
    divider: boolean;
}

export const CurrencySelectItemDisplay = (props: TokenItemProps) => {
    const { item, route, direction, divider } = props

    return <SelectItem>
        <SelectItem.Logo
            imgSrc={item.logo}
            secondaryLogoSrc={route.logo}
            altText={`${item.symbol} logo`}
            className="rounded-full"
        />
        {
            route.cex ?
                <SelectItem.DetailedTitle title={item.symbol} secondary={route.display_name} />
                :
                <NetworkTokenTitle item={item as NetworkRouteToken} route={route} direction={direction} />
        }
    </SelectItem>
}
type NetworkTokenItemProps = {
    route: NetworkRoute;
    item: NetworkRouteToken;
    direction: SwapDirection;
}
export const NetworkTokenTitle = (props: NetworkTokenItemProps) => {
    const { item, route, direction } = props
    const { provider } = useWallet(route, direction === "from" ? "withdrawal" : "autofil")
    const activeAddress = provider?.activeWallet
    const { balance } = useSWRBalance(activeAddress?.address, route)
    const tokenbalance = balance?.find(b => b.token === item.symbol)
    const formatted_balance_amount = tokenbalance?.amount ? Number(truncateDecimals(tokenbalance?.amount, item.precision)) : 0
    const balanceAmountInUsd = (item?.price_in_usd * formatted_balance_amount).toFixed(2)

    return <SelectItem.DetailedTitle title={item.symbol} secondary={route.display_name}>
        {
            tokenbalance &&
            <span className="text-xs text-secondary-text text-right my-auto">
                <div className="text-primary-text"> {formatted_balance_amount}</div>
                {Number(tokenbalance?.amount) > 0 && <div>${balanceAmountInUsd}</div>}
            </span>
        }
    </SelectItem.DetailedTitle>
}


type RouteItemProps = {
    item: Route;
    selected: boolean;
    direction: SwapDirection;
    divider: boolean;
}

export const RouteSelectItemDisplay = (props: RouteItemProps) => {
    const { item, selected, divider, direction } = props

    return item.cex ? <ExchangeRouteSelectItemDisplay item={item} divider={divider} selected={selected} />
        : <NetworkRouteSelectItemDisplay item={item} divider={divider} selected={selected} direction={direction} />
}

type NetworkRouteItemProps = {
    item: NetworkRoute;
    selected: boolean;
    direction: SwapDirection;
    divider: boolean;
}

const NetworkRouteSelectItemDisplay = (props: NetworkRouteItemProps) => {
    const { item, direction, divider } = props
    const { provider } = useWallet(item, direction === "from" ? "withdrawal" : "autofil")
    const activeAddress = provider?.activeWallet
    const { balance } = useSWRBalance(activeAddress?.address, item)

    const networkBalanceInUsd = useMemo(() => balance?.reduce((acc, b) => {
        const token = item?.tokens?.find(t => t?.symbol === b?.token);
        const tokenPriceInUsd = token?.price_in_usd || 0;
        const tokenPrecision = token?.precision || 0;
        const formattedBalance = Number(truncateDecimals(b?.amount, tokenPrecision));
        return acc + (formattedBalance * tokenPriceInUsd);
    }, 0), [balance, item])

    return <SelectItem>
        <SelectItem.Logo imgSrc={item.logo} altText={`${item.display_name} logo`} />
        <SelectItem.Title className={`py-3 ${divider ? 'border-t border-secondary-700' : ''}`} >
            <>
                <span>{item.display_name}</span>
                {
                    Number(balance?.length) > 0 &&
                    <div>
                        <span className="text-secondary-text font-light text-xs">{<span>${networkBalanceInUsd?.toFixed(2)}</span>}</span>
                    </div>
                }
            </>
        </SelectItem.Title>
    </SelectItem>
}
type ExchangeRouteItemProps = {
    item: Exchange;
    selected: boolean;
    divider: boolean;
}

const ExchangeRouteSelectItemDisplay = (props: ExchangeRouteItemProps) => {
    const { item, divider } = props

    return <SelectItem>
        <SelectItem.Logo imgSrc={item.logo} altText={`${item.display_name} logo`} />
        <SelectItem.Title className={`py-3 ${divider ? 'border-t border-secondary-700' : ''}`} >
            {item.display_name}
        </SelectItem.Title>
    </SelectItem>
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
    return <span className='flex grow text-left items-center text-xs md:text-base'>
        {
            value?.logo && <div className="flex items-center">
                <div className="flex-shrink-0 h-6 w-6 relative">
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

export const SelectedRouteDisplay = (props: SelectedRouteDisplayProps) => {
    const { route, token, placeholder } = props
    return <span className='flex grow text-left items-center text-xs md:text-base'>
        {
            token?.logo && route?.logo &&
            <div className='inline-flex items-center relative'>
                <Image
                    src={token?.logo}
                    alt="Token Logo"
                    height="36"
                    width="36"
                    loading="eager"
                    fetchPriority='high'
                    className="rounded-full object-contain"
                />
                <Image
                    src={route.logo}
                    alt="Route Logo"
                    height="20"
                    width="20"
                    loading="eager"
                    fetchPriority='high'
                    className='h-5 w-5 absolute -right-1.5 -bottom-1.5 object-contain rounded-md border-2 border-secondary-800'
                />
            </div>
        }

        {token && route ?
            <span className="ml-3 flex font-medium flex-auto space-x-1 text-primary-buttonTextColor items-center">
                <span>{token?.symbol}</span><span className="text-secondary-text font-light"> - {route?.display_name}</span>
            </span>
            :
            <span className="block font-medium text-primary-text-placeholder flex-auto items-center">
                {placeholder}
            </span>
        }
    </span>
}

