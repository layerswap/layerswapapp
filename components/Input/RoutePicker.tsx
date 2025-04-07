import { useFormikContext } from "formik";
import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SwapDirection, SwapFormValues } from "../DTOs/SwapFormValues";
import { NetworkRoute, NetworkRouteToken } from "../../Models/Network";
import { Selector, SelectorContent, SelectorTrigger } from "../Select/CommandNew/Index";
import { ChevronDown, Check } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../shadcn/accordion';
import { CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandWrapper } from "../shadcn/command";
import SpinIcon from "../icons/spinIcon";
import useWindowDimensions from "../../hooks/useWindowDimensions";
import { CurrencySelectItemDisplay, RouteSelectItemDisplay, SelectedRouteDisplay } from "../Select/Shared/Routes";
import { Exchange, ExchangeToken } from "../../Models/Exchange";
import React from "react";
import { ResolveCEXCurrencyOrder, ResolveCurrencyOrder, SortNetworkRoutes, SortNetworkRoutesWithBalances } from "../../lib/sorting";
import useFormRoutes from "../../hooks/useFormRoutes";
import { Route, RouteToken, RoutesGroup } from "../../Models/Route";
import useAllBalances from "../../hooks/useAllBalances";
import useWallet from "../../hooks/useWallet";
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { Wallet } from "../../Models/WalletProvider";
import { useNetworksBalanceStore } from "../../stores/networksBalanceStore";

function resolveSelectedRoute(values: SwapFormValues, direction: SwapDirection): NetworkRoute | Exchange | undefined {
    const { from, to, fromExchange, toExchange } = values
    return direction === 'from' ? fromExchange || from : toExchange || to;
}
function resolveSelectedToken(values: SwapFormValues, direction: SwapDirection) {
    const { fromCurrency, toCurrency, fromExchange, toExchange } = values
    //TODO: might need model refactoring as for now we just assume if exchange is selected then token is curencyGroup
    if ((direction === 'from' && fromExchange) || (direction === 'to' && toExchange)) {
        return values.currencyGroup
    }
    else
        return direction === 'from' ? fromCurrency : toCurrency;
}

const RoutePicker: FC<{ direction: SwapDirection }> = ({ direction }) => {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();
    const { isDesktop } = useWindowDimensions();
    // const { loading } = useAllBalances()

    const { allRoutes, isLoading, groupedRoutes } = useFormRoutes({ direction, values })
    const allNetworkRouteNames = useMemo(() => allRoutes.filter(r => !r.cex).map(r => r.name), [allRoutes])

    const allBalancesFetched = useNetworksBalanceStore((state) =>
        state.areAllBalancesFetched(allNetworkRouteNames)
    )

    const currencyFieldName = direction === 'from' ? 'fromCurrency' : 'toCurrency';

    const selectedRoute = resolveSelectedRoute(values, direction)
    const selectedToken = resolveSelectedToken(values, direction)

    useEffect(() => {

        if (!selectedRoute || !selectedToken || !allRoutes) return

        const updatedRoute = allRoutes.find(r => r.name === selectedRoute.name)

        //TODO: handle cex
        if (updatedRoute?.cex) {
            const updatedToken = updatedRoute?.token_groups?.find(t => t.symbol === selectedToken.symbol)
            if (updatedToken === selectedToken) return
            setFieldValue("currencyGroup", updatedToken, true)
            return;
        }

        const updatedToken = updatedRoute?.tokens?.find(t => t.symbol === selectedToken.symbol)

        if (updatedToken === selectedToken) return

        if (updatedRoute && updatedToken) {
            setFieldValue(currencyFieldName, updatedToken, true)
            setFieldValue(direction, updatedRoute, true)
        }

    }, [selectedRoute, selectedToken, allRoutes])

    const handleSelect = useCallback(async (route: Route, token: RouteToken) => {
        if (route.cex) {
            setFieldValue(currencyFieldName, null)
            setFieldValue(direction, null)

            setFieldValue('currencyGroup', token, true)
            setFieldValue(`${direction}Exchange`, route, true)
        }
        else {
            setFieldValue(`${direction}Exchange`, null)

            setFieldValue(currencyFieldName, token, true)
            setFieldValue(direction, route, true)
        }
    }, [currencyFieldName, direction, values])

    const [sort, srtSort] = useState(false)
    const handleSwitch = useCallback(() => { srtSort(!sort) }, [sort])
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
                            <div onClick={handleSwitch}>switch</div>
                            <CommandInput autoFocus={isDesktop} placeholder="Search" />
                            {isLoading ? (
                                <div className="flex justify-center h-full items-center">
                                    <SpinIcon className="animate-spin h-5 w-5" />
                                </div>
                            ) : (
                                <CommandList>
                                    <CommandEmpty>No results found.</CommandEmpty>
                                    {groupedRoutes.filter(g => g.routes?.length > 0).map((group) => {
                                        return <Group
                                            group={group}
                                            key={group.name}
                                            direction={direction}
                                            onSelect={(n, t) => { handleSelect(n, t); closeModal() }}
                                            selectedRoute={selectedRoute?.name}
                                            selectedToken={selectedToken?.symbol}
                                            loadingBalances={!allBalancesFetched}
                                        />
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
    loadingBalances: boolean;
    group: RoutesGroup;
    direction: SwapDirection;
    onSelect: (route: Route, token: RouteToken) => void;
    selectedRoute: string | undefined;
    selectedToken: string | undefined;
}
const Group = ({ group, direction, onSelect, selectedRoute, selectedToken, loadingBalances }: GroupProps) => {
    const [openValues, setOpenValues] = useState<string[]>(selectedRoute ? [selectedRoute] : [])

    const { wallets } = useWallet()

    const toggleAccordionItem = (value: string) => {
        setOpenValues((prev) =>
            prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
        )
    }

    const allNetworkRouteNames = useMemo(() => group.routes.filter(r => !r.cex).map(r => r.name), [group.routes])

    const allBalancesFetched = useNetworksBalanceStore((state) =>
        state.areAllBalancesFetched(allNetworkRouteNames)
    )

    const freezedRoutes = useRef<Route[]>([])
    const ordered = useRef<Route[]>()
    const hoveredRouteNamesRef = useRef<Set<string>>(new Set());
    const hoverLeaveTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    const handleMouseEnter = (routeName: string) => {
        // Cancel any pending timeout for this route
        const timeout = hoverLeaveTimeoutsRef.current.get(routeName);
        if (timeout) {
            clearTimeout(timeout);
            hoverLeaveTimeoutsRef.current.delete(routeName);
        }

        hoveredRouteNamesRef.current.add(routeName);
    };

    const handleMouseLeave = (routeName: string) => {
        const timeout = setTimeout(() => {
            hoveredRouteNamesRef.current.delete(routeName);
            hoverLeaveTimeoutsRef.current.delete(routeName);
        }, 100); // Delay in ms

        hoverLeaveTimeoutsRef.current.set(routeName, timeout);
    };
    const sorted = useMemo(() => {

        const sorting = allBalancesFetched ? SortNetworkRoutesWithBalances : SortNetworkRoutes
        const routes = ordered.current || group.routes
        const hovered = Array.from(hoveredRouteNamesRef.current);

        const freezedNames = [...openValues, ...hovered];

        freezedRoutes.current = [
            ...freezedRoutes.current,
            ...routes.filter(r => freezedNames.includes(r.name))
        ];

        const isFreezed = (name: string) =>
            freezedRoutes.current.some(fr => fr.name === name);

        const sortable = routes.filter(r => !isFreezed(r.name));
        const sortedNonFixed = [...sortable].sort(sorting);

        const finalSorted = routes.map((item) =>
            isFreezed(item.name) ? item : sortedNonFixed.shift()!
        );

        ordered.current = finalSorted;
        return finalSorted;

    }, [group.routes, allBalancesFetched])

    useEffect(() => {
        return () => {
            hoverLeaveTimeoutsRef.current.forEach(clearTimeout);
        };
    }, []);

    return <LayoutGroup>
        <motion.div layout="position">
            <CommandGroup heading={<span className='text-secondary-text pl-2'>{group.name.toUpperCase()}</span>}>
                <Accordion type="multiple" value={openValues} defaultValue={selectedRoute ? [selectedRoute] : []} >
                    {sorted.map((route, index) => {
                        return <RouteItem
                            onMouseEnter={() => handleMouseEnter(route.name)}
                            onMouseLeave={() => handleMouseLeave(route.name)}
                            wallets={wallets}
                            route={route}
                            underline={index > 0}
                            toggleContent={toggleAccordionItem}
                            onSelect={onSelect}
                            direction={direction}
                            key={route.name}
                            selectedRoute={selectedRoute}
                            selectedToken={selectedToken}
                        />
                    })}
                </Accordion>
            </CommandGroup >
        </motion.div>
    </LayoutGroup>
}

type RouteItemProps = {
    wallets?: Wallet[],
    route: Route,
    underline: boolean,
    toggleContent: (itemName: string) => void;
    direction: SwapDirection;
    onSelect: (route: Route, token: RouteToken) => void;
    selectedRoute: string | undefined;
    selectedToken: string | undefined;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}

function getSortedRouteTokens(route: Route) {
    if (route.cex) {
        return route.token_groups?.sort((a, b) => ResolveCEXCurrencyOrder(a) - ResolveCEXCurrencyOrder(b))
    }
    return route.tokens?.sort((a, b) => ResolveCurrencyOrder(a) - ResolveCurrencyOrder(b))
}

const RouteItem = ({ route, underline, toggleContent, direction, onSelect, selectedRoute, selectedToken, wallets, onMouseEnter, onMouseLeave }: RouteItemProps) => {

    const itemRef = React.useRef<HTMLDivElement>(null);

    const sortedTokens = getSortedRouteTokens(route)

    const filterValue = `${route.display_name} ${sortedTokens?.map(si => si.symbol).join(" ")}`;
    const [isAnimating, setIsAnimating] = useState(false);

    return (
        //// Wrap accordion with disabled command itme to filter out in search. (when accordion is oppen it will ocupy some space)
        <motion.div
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            layout="position"
        >
            <CommandItem
                ref={itemRef}
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
                                wallets={wallets}
                                item={route}
                                selected={false}
                                direction={direction}
                                divider={underline}
                            />
                        </AccordionTrigger>
                    </CommandItem >
                    <AccordionContent className={`rounded-md AccordionContent`}>
                        <div className='ml-8 pb-2'>
                            {
                                sortedTokens?.map((token: ExchangeToken | NetworkRouteToken, index) => {
                                    return <TokenCommandWrapper
                                        key={`${route.name}-${token.symbol}`}
                                        token={token}
                                        route={route}
                                        direction={direction}
                                        divider={index + 1 < sortedTokens.length}
                                        onSelect={onSelect}
                                        selectedRoute={selectedRoute}
                                        selectedToken={selectedToken}
                                    />
                                })
                            }
                        </div>
                    </AccordionContent>
                </AccordionItem >
            </CommandItem >
        </motion.div>
    )
}

type TokenCommandWrapperProps = {
    token: RouteToken;
    route: Route;
    direction: SwapDirection;
    divider: boolean;
    onSelect: (route: Route, token: RouteToken) => void;
    selectedRoute: string | undefined;
    selectedToken: string | undefined;
}


const TokenCommandWrapper = (props: TokenCommandWrapperProps) => {
    const { route, token, direction, onSelect, divider, selectedRoute, selectedToken } = props
    // const tokenItemRef = React.useRef<HTMLDivElement>(null);
    const isSelected = selectedRoute === route.name && selectedToken === token.symbol

    // useEffect(() => {
    //     if (isSelected && tokenItemRef.current) {
    //         tokenItemRef.current.scrollIntoView({ behavior: "instant", block: "center" });
    //     }
    // }, [isSelected])

    return <CommandItem
        className="border-l border-secondary-500 aria-selected:bg-secondary-700 aria-selected:text-primary-text hover:bg-secondary-700 relative"
        value={`${route.display_name} ${token.symbol} ##`}
        key={token.symbol}
        onSelect={() => { onSelect(route, token) }}
    // ref={tokenItemRef}
    >
        {
            isSelected &&
            <span className="absolute -left-4 -translate-x-1/2 -translate-y-1/2 top-1/2">
                <Check className='!h-4 !w-4 text-secondary-200' aria-hidden="true" />
            </span>
        }
        <CurrencySelectItemDisplay
            item={token}
            selected={false}
            route={route}
            direction={direction}
            divider={divider}
        />
    </CommandItem>

}


export default RoutePicker