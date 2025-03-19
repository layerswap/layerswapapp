import { RouteNetwork, RouteToken } from "../../../../Models/Network";
import useWallet from "../../../../hooks/useWallet";
import useSWRBalance from "../../../../lib/balances/useSWRBalance";
import { SwapDirection } from "../../../DTOs/SwapFormValues";
import { truncateDecimals } from "../../../utils/RoundDecimals";
import Image from 'next/image'
import { SelectItem } from "../../CommandNew/SelectItem/Index";
import { useMemo } from "react";

type TokenItemProps = {
    network: RouteNetwork;
    item: RouteToken;
    selected: boolean;
    direction: SwapDirection;
    divider: boolean;
}

export const CurrencySelectItemDisplay = (props: TokenItemProps) => {
    const { item, network, direction, divider } = props
    const { provider } = useWallet(network, direction === "from" ? "withdrawal" : "autofil")
    const activeAddress = provider?.activeWallet
    const { balance } = useSWRBalance(activeAddress?.address, network)
    const tokenbalance = balance?.find(b => b.token === item.symbol)
    const formatted_balance_amount = tokenbalance?.amount ? Number(truncateDecimals(tokenbalance?.amount, item.precision)) : 0
    const balanceAmountInUsd = (item?.price_in_usd * formatted_balance_amount).toFixed(2)

    const title = useMemo(() => {
        return <div className="flex justify-between w-full">
            <div className="grid gap-0 leading-none align-middle">
                <span className="align-middle">{item.symbol}</span>
                <div className="flex items-center space-x-0.5  align-middle" >
                    <span className="text-secondary-text text-xs font-light whitespace-nowrap">{network.display_name}</span>
                </div>
            </div>
            {
                tokenbalance &&
                <span className="text-xs text-secondary-text text-right my-auto">
                    <div className="text-primary-text"> {formatted_balance_amount}</div>
                    {Number(tokenbalance?.amount) > 0 && <div>${balanceAmountInUsd}</div>}
                </span>
            }
        </div>
    }, [item, network])

    return <SelectItem>
        <SelectItem.Logo
            imgSrc={item.logo}
            secondaryLogoSrc={network.logo}
            altText={`${item.symbol} logo`}
            className="rounded-full"
        />
        <SelectItem.Title title={title} className={`py-2 ${divider ? 'border-b border-secondary-700' : ''}`} />
    </SelectItem>
}

type RouteItemProps = {
    item: RouteNetwork;
    selected: boolean;
    direction: SwapDirection;
    divider: boolean;
}

export const RouteSelectItemDisplay = (props: RouteItemProps) => {
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

    const title = useMemo(() => {
        return <div className="flex justify-between w-full">
            <span className="">{item.display_name}</span>
            {
                Number(balance?.length) > 0 &&
                <div>
                    <span className="text-secondary-text font-light text-xs">{<span>${networkBalanceInUsd?.toFixed(2)}</span>}</span>
                </div>
            }
        </div>
    }, [item, networkBalanceInUsd])

    return <SelectItem>
        <SelectItem.Logo imgSrc={item.logo} altText={`${item.display_name} logo`} />
        <SelectItem.Title title={title} className={`py-3 ${divider ? 'border-t border-secondary-700' : ''}`} />
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
    route?: RouteNetwork;
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

