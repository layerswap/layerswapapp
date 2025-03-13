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
    const formatted_balance_amount = tokenbalance?.amount ? Number(truncateDecimals(tokenbalance?.amount, item.precision)) : ''
    const balanceAmountInUsd = formatted_balance_amount ? (item?.price_in_usd * formatted_balance_amount).toFixed(2) : undefined

    const title = useMemo(() => {
        return <div className="flex justify-between w-full">
            <div className="grid gap-0 leading-none align-middle">
                <span className="align-middle">{item.symbol}</span>
                <div className="flex items-center space-x-0.5  align-middle" >
                    <span className="text-secondary-text text-xs font-light whitespace-nowrap">{network.display_name}</span>
                </div>
            </div>
            {
                Number(formatted_balance_amount) > 0 &&
                <span className="text-xs text-secondary-text text-right">
                    <div className="text-primary-text">{Number(formatted_balance_amount).toFixed(2)}</div>
                    ${balanceAmountInUsd}
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

    const networkBalanceInUsd = balance?.reduce((acc, b) => {
        const token = item?.tokens?.find(t => t?.symbol === b?.token);
        const tokenPriceInUsd = token?.price_in_usd || 0;
        const tokenPrecision = token?.precision || 0;
        const formattedBalance = Number(truncateDecimals(b?.amount, tokenPrecision));
        return acc + (formattedBalance * tokenPriceInUsd);
    }, 0)

    const tokensWithBalance = item?.tokens?.filter((token) => {
        const tokenBalance = balance?.find((b) => b.token === token.symbol);
        return tokenBalance && Number(tokenBalance.amount) > 0;
    });

    const title = useMemo(() => {
        return <div className="flex justify-between w-full">
            <span className="">{item.display_name}</span>
            <div>
                <span className="text-secondary-text font-light text-xs">{Number(networkBalanceInUsd) > 0 ? <span>${networkBalanceInUsd?.toFixed(2)}</span> : <></>}</span>
            </div>
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
            route?.logo && <div className="flex items-center">
                <div className="flex-shrink-0 h-6 w-6 relative">
                    <Image
                        src={route.logo}
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
        {route ?
            <span className="ml-3 flex font-medium flex-auto space-x-1 text-primary-buttonTextColor items-center">
                {route.display_name}
            </span>
            :
            <span className="block font-medium text-primary-text-placeholder flex-auto items-center">
                {placeholder}
            </span>
        }
        {
            token &&
            <span className="ml-3 flex font-medium flex-auto space-x-1 text-primary-buttonTextColor items-center">
                {token.symbol}
            </span>
        }
    </span>
}

