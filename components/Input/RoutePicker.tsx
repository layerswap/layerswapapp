import { useFormikContext } from "formik";
import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandWrapper } from "../shadcn/command";
import { SelectItem } from "../Select/CommandNew/SelectItem/Index";
import useSWRBalance from "../../lib/balances/useSWRBalance";
import useWallet from "../../hooks/useWallet";
import SpinIcon from "../icons/spinIcon";
import useWindowDimensions from "../../hooks/useWindowDimensions";
import { CurrencySelectItemDisplay, RouteSelectItemDisplay, SelectedCurrencyDisplay, SelectedRouteDisplay } from "../Select/Shared/Routes";
import { Exchange } from "../../Models/Exchange";

type Route = { cex: true } & Exchange | { cex?: false } & RouteNetwork

type ResolveGroupNameProps = {
    route: Route;
    popularRoutes?: string[]
}
export class RoutesGroup {
    name: string;
    routes: Route[];
}

const GROUP_ORDERS = { "Popular": 1, "All Networks": 2, "Exchanges": 3 }

const resolveGroupName = ({ route, popularRoutes }: ResolveGroupNameProps) => {
    if (route.cex)
        return "Exchanges"

    if (!route.cex && route.tokens.some(t => t.status === "active") && popularRoutes?.includes(route.name))
        return "Popular";

    return "All Networks"
}

function groupRoutes(routes: Route[], popularRoutes?: string[]): RoutesGroup[] {
    let groups: RoutesGroup[] = [];
    routes.forEach((route) => {
        const routeGroupName = resolveGroupName({ route, popularRoutes })
        const existingGroup = groups.find(g => g.name === routeGroupName)
        if (existingGroup) {
            existingGroup.routes.push(route);
        }
        else {
            const group = { name: routeGroupName, routes: [route] };
            groups.push(group);
        }
    });

    groups.sort((a, b) => {
        // Sort put networks first then exchanges
        return (GROUP_ORDERS[a.name]) - (GROUP_ORDERS[b.name]);
    });

    return groups;
}


const RoutePicker: FC<{ direction: SwapDirection }> = ({ direction }) => {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();
    const { isDesktop } = useWindowDimensions();

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

    const [routesData, setRoutesData] = useState<RouteNetwork[] | undefined>(direction === 'from' ? sourceRoutes : destinationRoutes)

    useEffect(() => {
        if (!isLoading && routes?.data) setRoutesData(routes.data)
    }, [routes])

    const selectedRoute = direction === 'from' ? from : to;
    const selectedToken = direction === 'from' ? fromCurrency : toCurrency;

    const popularRoutes = useMemo(() => routesData
        ?.filter(r => r.tokens?.some(r => r.status === 'active'))
        ?.sort((a, b) =>
        (direction === "from"
            ? (a.source_rank ?? 0) - (b.source_rank ?? 0)
            : (a.destination_rank ?? 0) - (b.destination_rank ?? 0))
        )
        .slice(0, 5)
        .map(r => r.name) || [], [routesData])

    const handleSelect = useCallback((network: RouteNetwork, token: RouteToken) => {
        setFieldValue(name, token, true)
        setFieldValue(direction, network, true)
    }, [name, direction])

    const groups = useMemo(() => groupRoutes(routesData || [], popularRoutes), [routesData, popularRoutes])
    return (
        <div className="relative">
            <Selector>
                <SelectorTrigger disabled={false}>
                    <SelectedRouteDisplay route={selectedRoute} token={selectedToken} placeholder="Source" />
                    <span className="ml-3 right-0 flex items-center pr-2 pointer-events-none text-primary-text">
                        <ChevronDown className="h-4 w-4 text-secondary-text" aria-hidden="true" />
                    </span>
                </SelectorTrigger>
                <SelectorContent isLoading={isLoading} modalHeight="full" searchHint="Search">
                    {({ closeModal }) => (
                        <CommandWrapper>
                            <CommandInput autoFocus={isDesktop} placeholder="Search" />
                            {isLoading ? (
                                <div className="flex justify-center h-full items-center">
                                    <SpinIcon className="animate-spin h-5 w-5" />
                                </div>
                            ) : (
                                <CommandList>
                                    <CommandEmpty>No results found.</CommandEmpty>
                                    {groups.filter(g => g.routes?.length > 0).map((group) => {

                                        return (<Group group={group} key={group.name} direction={direction} onSelect={(n, t) => { handleSelect(n, t); closeModal() }} />)
                                    })}
                                </CommandList>
                            )}
                        </CommandWrapper>
                    )}
                </SelectorContent>
            </Selector>
        </div>
    )
};

type GroupProps = {
    group: RoutesGroup;
    direction: SwapDirection;
    onSelect: (network: RouteNetwork, token: RouteToken) => void;
}
const Group = ({ group, direction, onSelect }: GroupProps) => {
    const [openValues, setOpenValues] = useState<string[]>([])
    const toggleAccordionItem = (value: string) => {
        setOpenValues((prev) =>
            prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
        );
    };
    return <CommandGroup heading={<span className='text-secondary-text pl-2'>{group.name.toUpperCase()}</span>}>
        <Accordion type="multiple" value={openValues}>
            {group.routes.map((route, index) => {
                return (<GroupItem route={route} underline={index > 0} toggleContent={toggleAccordionItem} onSelect={onSelect} direction={direction} key={route.name} />)
            })}
        </Accordion>
    </CommandGroup>
}

type GroupItemProps = {
    route: Route,
    underline: boolean,
    toggleContent: (itemName: string) => void;
    direction: SwapDirection;
    onSelect: (network: RouteNetwork, token: RouteToken) => void;
}
const GroupItem = ({ route, underline, toggleContent, direction, onSelect }: GroupItemProps) => {

    if (route.cex)
        return <></>

    const filterValue = `${route.display_name} ${route.tokens?.map(si => si.symbol).join(" ")}`
    return (
        //// Wrap accordion with disabled command itme to filter out in search (when accordion is oppen it will ocupy some space)
        <CommandItem
            disabled={true}
            value={`${filterValue} **`} >
            <AccordionItem value={route.name}>
                <CommandItem
                    className="aria-selected:bg-secondary-700 aria-selected:text-primary-text hover:bg-secondary-700"
                    value={filterValue}
                    key={route.name}
                    onSelect={() => { toggleContent(route.name) }}>
                    <AccordionTrigger>
                        <RouteSelectItemDisplay
                            item={route}
                            selected={false}
                            direction={direction}
                            divider={underline}
                        />
                    </AccordionTrigger>
                </CommandItem >
                <AccordionContent className="rounded-md AccordionContent">
                    <div className='ml-8 pb-2'>
                        {
                            route.tokens?.map((token, index) =>
                                <CommandItem
                                    className="border-l border-secondary-500 aria-selected:bg-secondary-700 aria-selected:text-primary-text hover:bg-secondary-700"
                                    value={`${route.display_name} ${token.symbol}`}
                                    key={token.symbol}
                                    onSelect={() => { onSelect(route, token) }}>
                                    <CurrencySelectItemDisplay
                                        item={token}
                                        selected={false}
                                        network={route}
                                        direction={direction}
                                        divider={index + 1 < route.tokens.length}
                                    />
                                </CommandItem>
                            )
                        }
                    </div>
                </AccordionContent>
            </AccordionItem >
        </CommandItem >
    )
}


export default RoutePicker