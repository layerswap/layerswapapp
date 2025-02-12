import { useFormikContext } from "formik";
import { FC, useCallback } from "react";
import { SwapDirection, SwapFormValues } from "../DTOs/SwapFormValues";
import { RouteNetwork, RouteToken } from "../../Models/Network";
import LayerSwapApiClient from "../../lib/layerSwapApiClient";
import useSWR from "swr";
import { ApiResponse } from "../../Models/ApiResponse";
import { resolveNetworkRoutesURL } from "../../helpers/routes";
import { useSettingsState } from "../../context/settings";
import Image from 'next/image'
import { Selector, SelectorContent, SelectorTrigger } from "../Select/CommandNew/Index";
import { ChevronDown } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../shadcn/accordion';
import { CommandItem } from "../shadcn/command";
import { SelectItem } from "../Select/CommandNew/SelectItem/Index";
import useSWRBalance from "../../lib/balances/useSWRBalance";
import useWallet from "../../hooks/useWallet";
import { truncateDecimals } from "../utils/RoundDecimals";

const RoutePicker: FC<{ direction: SwapDirection }> = ({ direction }) => {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();

    const { from, to, fromCurrency, toCurrency, destination_address, currencyGroup } = values
    const name = direction === 'from' ? 'fromCurrency' : 'toCurrency';
    const { destinationRoutes, sourceRoutes } = useSettingsState();

    const networkRoutesURL = resolveNetworkRoutesURL(direction, values)

    const apiClient = new LayerSwapApiClient()
    const {
        data: routes,
        isLoading,
        error
    } = useSWR<ApiResponse<RouteNetwork[]>>(networkRoutesURL, apiClient.fetcher, { keepPreviousData: true, dedupingInterval: 10000, fallbackData: { data: direction === 'from' ? sourceRoutes : destinationRoutes }, })

    const selectedValue = direction === 'from' ? fromCurrency : toCurrency;


    const handleSelect = useCallback((network: RouteNetwork, token: RouteToken) => {

        setFieldValue(name, token, true)
        setFieldValue(direction, network, true)

    }, [name, direction])


    return (
        <div className="relative">
            <Selector>
                <SelectorTrigger disabled={false}>
                    <SelectedCurrencyDisplay value={selectedValue} placeholder="Asset" />
                    <span className="ml-3 right-0 flex items-center pr-2 pointer-events-none  text-primary-text">
                        {<ChevronDown className="h-4 w-4 text-secondary-text" aria-hidden="true" />}
                    </span>
                </SelectorTrigger>
                <SelectorContent isLoading={isLoading} modalHeight="full" searchHint='Search'>
                    {({ closeModal }) => {
                        return <>{
                            routes?.data?.map(route => {
                                return <CommandItem value={route.display_name} key={route.name} className="!py-0 mb-1">
                                    <Accordion type="single" collapsible key={route.name} defaultValue="Selected Network">
                                        <AccordionItem value={route.name}>
                                            <AccordionTrigger className="flex items-center w-full overflow-hidden rounded-md p-2 gap-2 hover:bg-secondary-500 data-[state=open]:bg-secondary">
                                                <RouteSelectItemDisplay item={route} selected={false} direction={direction} />
                                            </AccordionTrigger>
                                            <AccordionContent className="rounded-md pl-5 pr-2 bg-secondary-700 py-2 mt-1">
                                                <div className="space-y-3">
                                                    {route?.tokens?.map(token => (
                                                        <div
                                                            key={token.symbol}
                                                            onClick={() => { handleSelect(route, token); closeModal(); }}
                                                        >
                                                            <CurrencySelectItemDisplay item={token} selected={false} network={route} direction={direction} />
                                                        </div>
                                                    ))}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </CommandItem>
                            })
                        }</>
                    }}
                </SelectorContent>
            </Selector>
        </div>
    )
};

type TokenItemProps = {
    network: RouteNetwork;
    item: RouteToken;
    selected: boolean;
    direction: SwapDirection;
}

const CurrencySelectItemDisplay = (props: TokenItemProps) => {
    const { item, network, direction } = props
    const { provider } = useWallet(network, direction === "from" ? "withdrawal" : "autofil")
    const activeAddress = provider?.activeWallet
    const { balance } = useSWRBalance(activeAddress?.address, network)
    const tokenbalance = balance?.find(b => b.token === item.symbol)
    const formatted_balance_amount = tokenbalance?.amount ? Number(truncateDecimals(tokenbalance?.amount, item.precision)) : ''
    const balanceAmountInUsd = formatted_balance_amount ? (item?.price_in_usd * formatted_balance_amount).toFixed(2) : undefined

    const title = <div>
        <span className="">{item.symbol}</span>
        <div
            className="w-4 h-4 flex items-center space-x-0.5"
        >
            <Image
                src={network.logo}
                alt={`${network.name} logo`}
                width={24}
                height={24}
                className="rounded"
            />
            <span className="text-secondary-text text-xs whitespace-nowrap font-medium">{network.display_name}</span>
        </div>
    </div>

    return <SelectItem>
        <SelectItem.Logo
            imgSrc={item.logo}
            altText={`${item.symbol} logo`}
            className="rounded-full"
        />
        <SelectItem.Title title={title} />
        {activeAddress ? (
            <p className="text-primary-text text-sm flex flex-col items-end">
                {Number(formatted_balance_amount) ?
                    <span>{Number(formatted_balance_amount).toFixed(2)}</span>
                    :
                    <span>0</span>
                }
                {balanceAmountInUsd ?
                    <span className="text-secondary-text">${balanceAmountInUsd}</span>
                    :
                    <span className="text-secondary-text">$0</span>
                }
            </p>) : <></>
        }
    </SelectItem>
}


type RouteItemProps = {
    item: RouteNetwork;
    selected: boolean;
    direction: SwapDirection;
}

const RouteSelectItemDisplay = (props: RouteItemProps) => {
    const { item, direction } = props
    const { provider } = useWallet(item, direction === "from" ? "withdrawal" : "autofil")
    const activeAddress = provider?.activeWallet
    const { balance } = useSWRBalance(activeAddress?.address, item)

    const networkBalanceInUsd = balance?.reduce((acc, b) => {
        const token = item?.tokens?.find(t => t?.symbol === b?.token);
        const tokenPriceInUsd = token?.price_in_usd || 0;
        const tokenPrecision = token?.precision || 0;
        const formattedBalance = Number(truncateDecimals(b?.amount, tokenPrecision));
        return acc + (formattedBalance * tokenPriceInUsd);
    }, 0).toFixed(2) || '0.00';

    const tokensWithBalance = item?.tokens?.filter((token) => {
        const tokenBalance = balance?.find((b) => b.token === token.symbol);
        return tokenBalance && Number(tokenBalance.amount) > 0;
    });

    return <SelectItem>
        <SelectItem.Logo imgSrc={item.logo} altText={`${item.display_name} logo`} />
        <SelectItem.Title title={item.display_name} />
        <div>
            <span className="text-secondary-text">${networkBalanceInUsd}</span>
            <div className="flex justify-end items-center w-full relative">
                {tokensWithBalance?.map((token, index) => (
                    <div
                        key={token.symbol}
                        className={`${index === 0 ? "" : "-ml-1"} w-4 h-4 rounded-full`}
                    >
                        <Image
                            src={token.logo}
                            alt={`${token.symbol} logo`}
                            width={24}
                            height={24}
                            className="rounded-full"
                        />
                    </div>
                ))}
            </div>
        </div>
    </SelectItem>
}

type SelectedCurrencyDisplayProps = {
    value: {
        logo: string
        symbol: string
    } | undefined;
    placeholder: string;
}

const SelectedCurrencyDisplay = (props: SelectedCurrencyDisplayProps) => {
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

export default RoutePicker