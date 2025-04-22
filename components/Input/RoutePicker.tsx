import { useFormikContext } from "formik";
import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { SwapDirection, SwapFormValues } from "../DTOs/SwapFormValues";
import { NetworkRoute, NetworkRouteToken } from "../../Models/Network";
import { Selector, SelectorContent, SelectorTrigger } from "../Select/CommandNew/Index";
import { ChevronDown, Search } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../shadcn/accordion';
import { CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandWrapper } from "../shadcn/command";
import SpinIcon from "../icons/spinIcon";
import useWindowDimensions from "../../hooks/useWindowDimensions";
import { CurrencySelectItemDisplay, RouteSelectItemDisplay, SelectedRouteDisplay } from "../Select/Shared/Routes";
import { Exchange, ExchangeToken } from "../../Models/Exchange";
import React from "react";
import { ResolveCEXCurrencyOrder, ResolveCurrencyOrder, SortNetworkRoutes } from "../../lib/sorting";
import useFormRoutes from "../../hooks/useFormRoutes";
import { Route, RouteToken, RoutesGroup } from "../../Models/Route";
import Balance from "./Amount/Balance";

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

    const { allRoutes, isLoading, groupedRoutes } = useFormRoutes({ direction, values })
    const [searchQuery, setSearchQuery] = useState("")

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

    const filteredGroups = useMemo(() => {
        if (!searchQuery) return groupedRoutes;

        return groupedRoutes.map(group => ({
            ...group,
            routes: group.routes?.filter(route => {
                const routeMatch = route.display_name.toLowerCase().includes(searchQuery.toLowerCase());
                return routeMatch;
            })
        })).filter(group => group.routes && group.routes.length > 0);
    }, [groupedRoutes, searchQuery]);

    const flatTokenResults = useMemo(() => {
        if (!searchQuery || !allRoutes) return [];

        return allRoutes.flatMap(route => {
            const tokens = getSortedRouteTokens(route) || [];
            return tokens
                .filter(token => token.symbol.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(token => ({ route, token }));
        });
    }, [allRoutes, searchQuery]);

    return (
        <div className="flex w-full flex-col self-end relative ml-auto items-center">
            <Selector>
                <SelectorTrigger disabled={false}>
                    <SelectedRouteDisplay route={selectedRoute} token={selectedToken} placeholder="Select Token" />
                </SelectorTrigger>
                <SelectorContent isLoading={isLoading} modalHeight="full" searchHint="Search">
                    {({ closeModal }) => (
                        <div className="flex h-full w-full flex-col overflow-hidden rounded-md">
                            <div className="flex items-center bg-secondary-500 rounded-lg px-2 mb-2">
                                <Search className="w-6 h-6 mr-2 text-primary-text-placeholder" />
                                <input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus={isDesktop}
                                    placeholder="Search"
                                    autoComplete="off"
                                    className="placeholder:text-primary-text-placeholder border-0 border-b-0 border-primary-text bg-secondary-500 focus:border-primary-text appearance-none block py-2.5 px-0 w-full h-11 text-base outline-none focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>
                            {isLoading ? (
                                <div className="flex justify-center h-full items-center">
                                    <SpinIcon className="animate-spin h-5 w-5" />
                                </div>
                            ) : filteredGroups.length === 0 ? (
                                <div className="text-center text-secondary-text">No results found.</div>
                            ) : (
                                <div className="overflow-y-auto styled-scroll hide-main-scrollbar">
                                    {filteredGroups.map((group) => (
                                        <Group
                                            group={group}
                                            key={group.name}
                                            direction={direction}
                                            onSelect={(n, t) => {
                                                handleSelect(n, t);
                                                closeModal();
                                            }}
                                            selectedRoute={selectedRoute?.name}
                                            selectedToken={selectedToken?.symbol}
                                        />
                                    ))}

                                    {flatTokenResults.length > 0 && (
                                        <div className="mb-2">
                                            <div className="text-primary-text-placeholder text-base mb-1 px-3">Tokens</div>
                                            <div className="bg-secondary-400 rounded-xl overflow-hidden mx-3">
                                                {flatTokenResults.map(({ route, token }) => {
                                                    const isSelected = selectedRoute?.display_name === route.name && selectedToken?.symbol === token.symbol;
                                                    return (
                                                        <div
                                                            key={`${route.name}-${token.symbol}-flat`}
                                                            className={`pl-4 cursor-pointer hover:bg-secondary-300 ${isSelected ? "bg-secondary-300" : ""}`}
                                                            onClick={() => {
                                                                handleSelect(route, token);
                                                                closeModal();
                                                            }}
                                                        >
                                                            <CurrencySelectItemDisplay
                                                                item={token}
                                                                selected={isSelected}
                                                                route={route}
                                                                direction={direction}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </SelectorContent>
            </Selector>
            {direction === 'from' &&
                <Balance values={values} direction="from" />
            }
        </div>
    )
};

type GroupProps = {
    group: RoutesGroup;
    direction: SwapDirection;
    onSelect: (route: Route, token: RouteToken) => void;
    selectedRoute: string | undefined;
    selectedToken: string | undefined;
}
const Group = ({ group, direction, onSelect, selectedRoute, selectedToken }: GroupProps) => {
    const [openValues, setOpenValues] = useState<string[]>(selectedRoute ? [selectedRoute] : [])
    const toggleAccordionItem = (value: string) => {
        setOpenValues((prev) =>
            prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
        )
    }

    return (
        <div className="overflow-hidden p-1 py-1.5 text-primary-text">
            <div className="text-primary-text-placeholder text-base mb-2 px-3">{group.name}</div>
            <div className="bg-secondary-700 rounded-lg px-2">
                <Accordion type="multiple" value={openValues} className="space-y-2">
                    {group.routes.sort(SortNetworkRoutes).map((route, index) => (
                        <GroupItem
                            key={route.name}
                            route={route}
                            underline={index > 0}
                            toggleContent={toggleAccordionItem}
                            onSelect={onSelect}
                            direction={direction}
                            selectedRoute={selectedRoute}
                            selectedToken={selectedToken}
                        />
                    ))}
                </Accordion>
            </div>
        </div>
    )
}

type GroupItemProps = {
    route: Route,
    underline: boolean,
    toggleContent: (itemName: string) => void;
    direction: SwapDirection;
    onSelect: (route: Route, token: RouteToken) => void;
    selectedRoute: string | undefined;
    selectedToken: string | undefined;
}

function getSortedRouteTokens(route: Route) {
    if (route.cex) {
        return route.token_groups?.sort((a, b) => ResolveCEXCurrencyOrder(a) - ResolveCEXCurrencyOrder(b))
    }
    return route.tokens?.sort((a, b) => ResolveCurrencyOrder(a) - ResolveCurrencyOrder(b))
}

const GroupItem = ({
    route,
    underline,
    toggleContent,
    direction,
    onSelect,
    selectedRoute,
    selectedToken
}: GroupItemProps) => {
    const sortedTokens = getSortedRouteTokens(route)
    const filterValue = `${route.display_name} ${sortedTokens?.map(si => si.symbol).join(" ")}`

    return (
        <div>
            <AccordionItem value={route.name}>
                <div
                    onClick={() => toggleContent(route.name)}
                    className="cursor-pointer bg-secondary-700 rounded-lg hover:bg-secondary-600"
                >
                    <AccordionTrigger>
                        <RouteSelectItemDisplay
                            item={route}
                            selected={false}
                            direction={direction}
                        />
                    </AccordionTrigger>
                </div>
                <AccordionContent className="AccordionContent mt-1">
                    <div className='has-[.token-item]:mt-1 bg-secondary-400 rounded-xl overflow-hidden'>
                        {sortedTokens?.map((token, index) => (
                            <TokenCommandWrapper
                                key={`${route.name}-${token.symbol}`}
                                token={token}
                                route={route}
                                direction={direction}
                                onSelect={onSelect}
                                selectedRoute={selectedRoute}
                                selectedToken={selectedToken}
                            />
                        ))}
                    </div>
                </AccordionContent>
            </AccordionItem>
        </div>
    )
}

type TokenCommandWrapperProps = {
    token: RouteToken;
    route: Route;
    direction: SwapDirection;
    onSelect: (route: Route, token: RouteToken) => void;
    selectedRoute: string | undefined;
    selectedToken: string | undefined;
}

const TokenCommandWrapper = ({
    token,
    route,
    direction,
    onSelect,
    selectedRoute,
    selectedToken
}: TokenCommandWrapperProps) => {
    const tokenItemRef = React.useRef<HTMLDivElement>(null)
    const isSelected = selectedRoute === route.name && selectedToken === token.symbol

    useEffect(() => {
        if (isSelected && tokenItemRef.current) {
            tokenItemRef.current.scrollIntoView({ behavior: "instant", block: "center" });
        }
    }, [isSelected])

    return (
        <div
            ref={tokenItemRef}
            className={`pl-5 cursor-pointer hover:bg-secondary-300 ${isSelected ? "bg-secondary-300" : ""} outline-none disabled:cursor-not-allowed`}
            onClick={() => onSelect(route, token)}
        >
            <CurrencySelectItemDisplay
                item={token}
                selected={isSelected}
                route={route}
                direction={direction}
            />
        </div>
    )
}


export default RoutePicker