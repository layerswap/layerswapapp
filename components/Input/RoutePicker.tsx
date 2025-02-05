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
import { SeelctItem } from "../Select/CommandNew/SelectItem/Index";
import useSWRBalance from "../../lib/balances/useSWRBalance";
import useWallet from "../../hooks/useWallet";

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
                        {<ChevronDown className="h-4 w-4" aria-hidden="true" />}
                    </span>
                </SelectorTrigger>
                <SelectorContent isLoading={isLoading} modalHeight="full" searchHint='Search'>
                    {({ closeModal }) => {
                        return <>{
                            routes?.data?.map(route => {
                                return <CommandItem value={route.display_name} key={route.name} >
                                    <Accordion type="single" collapsible key={route.name} defaultValue="Selected Network">
                                        <AccordionItem value={route.name}>
                                            <AccordionTrigger className="flex mb-1 items-center w-full overflow-hidden rounded-md p-2 gap-2 hover:bg-secondary-500 data-[state=open]:bg-secondary">
                                                <RouteSelectItemDisplay item={route} selected={false} direction={direction} />
                                            </AccordionTrigger>
                                            <AccordionContent className="rounded-md">
                                                {route?.tokens?.map(token => (
                                                    <div onClick={() => { handleSelect(route, token); closeModal(); }}>
                                                        <CurrencySelectItemDisplay key={token.symbol} item={token} selected={false} network={route} direction={direction} />
                                                    </div>
                                                ))}
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
    console.log(tokenbalance, item.symbol)
    return <SeelctItem>
        <SeelctItem.Logo imgSrc={item.logo} altText={`${item.symbol} logo`} />
        <SeelctItem.Title title={item.symbol} />
        <div>{tokenbalance?.amount}</div>
    </SeelctItem>
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

    return <SeelctItem>
        <SeelctItem.Logo imgSrc={item.logo} altText={`${item.display_name} logo`} />
        <SeelctItem.Title title={item.display_name} />
        <div>_._</div>
    </SeelctItem>
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
                        className="rounded-md object-contain"
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