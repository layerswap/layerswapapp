import { useFormikContext } from "formik";
import { FC, useCallback, useEffect, useState } from "react";
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
import { ResolveCEXCurrencyOrder, ResolveCurrencyOrder, SortNetworkRoutes } from "../../lib/sorting";
import useFormRoutes from "../../hooks/useFormRoutes";
import { Route, RouteToken, RoutesGroup } from "../../Models/Route";
import Balance from "./Amount/Balance";
import { useAmountFocus } from "../../context/amountFocusContext";

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
    const { isAmountFocused } = useAmountFocus()

    const { allRoutes, isLoading, groupedRoutes } = useFormRoutes({ direction, values })

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

    return (
        <div className="relative self-end ml-auto">
            <Selector>
                <SelectorTrigger disabled={false}>
                    <SelectedRouteDisplay route={selectedRoute} token={selectedToken} placeholder="Select Token" isAmountFocused={isAmountFocused} />
                    <span className="right-0 flex items-center pr-2 pointer-events-none text-primary-text">
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
                                    {groupedRoutes.filter(g => g.routes?.length > 0).map((group) => {
                                        return <Group
                                            group={group}
                                            key={group.name}
                                            direction={direction}
                                            onSelect={(n, t) => { handleSelect(n, t); closeModal() }}
                                            selectedRoute={selectedRoute?.name}
                                            selectedToken={selectedToken?.symbol}
                                        />
                                    })}
                                </CommandList>
                            )}
                        </CommandWrapper>
                    )}
                </SelectorContent>
            </Selector>
            {direction === 'from' &&
                <div className="bg-secondary-500 rounded-b-lg w-4/5 m-auto -mt-0.5 py-0.5 text-xs text-primary-text-placeholder text-center">
                    <Balance values={values} direction="from" />
                </div>
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
    return <CommandGroup heading={<span className='text-primary-text-placeholder text-base'>{group.name}</span>}>
        <div className="bg-secondary-900">
            <Accordion type="multiple" value={openValues} defaultValue={selectedRoute ? [selectedRoute] : []} className="space-y-2">
                {group.routes.sort(SortNetworkRoutes).map((route, index) => {
                    return <GroupItem
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
        </div>
    </CommandGroup>
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

const GroupItem = ({ route, underline, toggleContent, direction, onSelect, selectedRoute, selectedToken }: GroupItemProps) => {

    const itemRef = React.useRef<HTMLDivElement>(null);

    const sortedTokens = getSortedRouteTokens(route)

    const filterValue = `${route.display_name} ${sortedTokens?.map(si => si.symbol).join(" ")}`;

    return (
        //// Wrap accordion with disabled command itme to filter out in search. (when accordion is oppen it will ocupy some space)
        <CommandItem
            ref={itemRef}
            disabled={true}
            value={`${filterValue} **`}>
            <AccordionItem value={route.name}>
                <CommandItem
                    value={filterValue}
                    key={route.name}
                    onSelect={() => { toggleContent(route.name) }} className="bg-secondary-900">
                    <AccordionTrigger>
                        <RouteSelectItemDisplay
                            item={route}
                            selected={false}
                            direction={direction}
                            divider={underline}
                        />
                    </AccordionTrigger>
                </CommandItem >
                <AccordionContent className="rounded-xl AccordionContent">
                    <div className='pb-2 mt-1 bg-secondary-800'>
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
    const tokenItemRef = React.useRef<HTMLDivElement>(null);
    const isSelected = selectedRoute === route.name && selectedToken === token.symbol

    useEffect(() => {
        if (isSelected && tokenItemRef.current) {
            tokenItemRef.current.scrollIntoView({ behavior: "instant", block: "center" });
        }
    }, [isSelected])

    return <div className={`${isSelected ? "bg-secondary-700" : ""} pl-5 hover:bg-secondary-700 aria-selected:bg-secondary-700`}>
        <CommandItem
            className="aria-selected:text-primary-text relative"
            value={`${route.display_name} ${token.symbol} ##`}
            key={token.symbol}
            onSelect={() => { onSelect(route, token) }}
            ref={tokenItemRef}
        >
            <CurrencySelectItemDisplay
                item={token}
                selected={false}
                route={route}
                direction={direction}
                divider={divider}
            />
        </CommandItem>
    </div>
}


export default RoutePicker