import { useFormikContext } from "formik";
import { FC, useCallback, useEffect, useRef, useState } from "react";
import { SwapDirection, SwapFormValues } from "../DTOs/SwapFormValues";
import { Selector, SelectorContent, SelectorTrigger, useSelectorState } from "../Select/CommandNew/Index";
import { Exchange, ExchangeToken } from "../../Models/Exchange";
import React from "react";
import { ExchangeElement } from "../../Models/Route";
import { SelectItem } from "../Select/CommandNew/SelectItem/Index";
import { Partner } from "../../Models/Partner";
import useFormRoutes from "@/hooks/useFormRoutes";
import { SelectedRoutePlaceholder } from "./RoutePicker/Routes";
import { useVirtualizer } from "@/lib/virtual";
import { LayoutGroup, motion } from "framer-motion";
import { SearchComponent } from "./Search";
import { ImageWithFallback } from "../Common/ImageWithFallback";
import { ChevronDown } from "lucide-react";

const CexPicker: FC<{ partner?: Partner | undefined }> = ({ partner }) => {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();
    const direction = "from"

    const { exchangeElements, exchangesRoutesLoading: isLoading, selectedRoute, selectedToken, exchangeNetworks } = useFormRoutes({ direction, values });
    const { fromExchange, toAsset } = values;
    const { isOpen } = useSelectorState();

    const parentRef = useRef<HTMLDivElement>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const virtualizer = useVirtualizer({
        count: exchangeElements?.length || 0,
        estimateSize: () => 50,
        getScrollElement: () => parentRef.current,
        overscan: 10
    });
    const items = virtualizer.getVirtualItems();

    useEffect(() => {
        const updateValues = async () => {
            if (!fromExchange) return;

            const currencyGroup = fromExchange?.token_groups?.find(group => group.symbol === toAsset?.symbol);
            const sourceRoute = exchangeNetworks?.find(route =>
                route?.tokens?.some(token => token.symbol === toAsset?.symbol && token.status === 'active')
            );

            const sourceRouteToken = sourceRoute?.tokens?.find(
                token => token.symbol === toAsset?.symbol && token.status === 'active'
            );

            if (values.currencyGroup !== currencyGroup) {
                await setFieldValue("currencyGroup", currencyGroup, true);
                await setFieldValue("from", sourceRoute, true)
                await setFieldValue(`fromAsset`, sourceRouteToken, false)
            }
        };

        updateValues();
    }, [selectedRoute, selectedToken, exchangeNetworks, selectedToken, exchangeElements]);

    const handleSelect = useCallback(async (exchange: Exchange) => {
        setFieldValue("fromExchange", exchange, true)
    }, [direction, values])

    return (
        <div className="flex w-full flex-col self-end relative ml-auto items-center" ref={parentRef}>
            <Selector>
                <SelectorTrigger disabled={false}>
                    <SelectedNetworkDisplay exchange={fromExchange} placeholder="Select Token" />
                </SelectorTrigger>
                <SelectorContent isLoading={isLoading} modalHeight="full" searchHint="Search" header="">
                    {({ closeModal }) => (
                        <div className="overflow-y-auto flex flex-col h-full z-40" >
                            <SearchComponent searchQuery={searchQuery} setSearchQuery={setSearchQuery} isOpen={isOpen} />
                            <LayoutGroup>
                                <motion.div layoutScroll className="select-text in-has-[.hide-main-scrollbar]:overflow-y-hidden overflow-y-auto overflow-x-hidden styled-scroll pr-3 h-full">
                                    <div className="relative">
                                        <div
                                            style={{
                                                height: virtualizer.getTotalSize(),
                                                width: '100%',
                                                position: 'relative',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    width: '100%',
                                                    transform: `translateY(${items[0]?.start ? (items[0]?.start - 0) : 0}px)`,
                                                }}>
                                                {items.map((virtualRow) => {
                                                    const data = exchangeElements?.[virtualRow.index] as ExchangeElement
                                                    const route = data?.route
                                                    const key = ((data as any)?.route as any)?.name || virtualRow.key;
                                                    return <div
                                                        className="py-1 box-border"
                                                        key={key}
                                                        data-index={virtualRow.index}
                                                        ref={virtualizer.measureElement}>
                                                        <ExchangeNetwork
                                                            key={key}
                                                            route={route}
                                                            direction={direction}
                                                            onSelect={(n) => {
                                                                handleSelect(n);
                                                                closeModal();
                                                            }}
                                                        />
                                                    </div>
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </LayoutGroup>
                        </div>
                    )}
                </SelectorContent>
            </Selector>
        </div>

    )
}

type ExchangeNetworkProps = {
    route: Exchange;
    direction: SwapDirection;
    onSelect: (route: Exchange) => void;
}

const ExchangeNetwork = (props: ExchangeNetworkProps) => {
    const { route, onSelect } = props

    return <div className="bg-secondary-500 cursor-pointer hover:bg-secondary-400 rounded-xl outline-none disabled:cursor-not-allowed relative" onClick={() => onSelect(route)} >
        <SelectItem>
            <SelectItem.Logo imgSrc={route.logo} altText={`${route.display_name} logo`} />
            <SelectItem.Title className="py-3">{route.display_name}</SelectItem.Title>
        </SelectItem>
    </div>
}

type SelectedNetworkDisplayProps = {
    exchange?: Exchange;
    placeholder: string;
}

export const SelectedNetworkDisplay = (props: SelectedNetworkDisplayProps) => {
    const { exchange, placeholder } = props

    return (
        <span className="flex grow text-left items-center text-xs md:text-base relative">
            {exchange ? (
                <>
                    <div className="inline-flex items-center relative shrink-0">
                        <ImageWithFallback
                            src={exchange.logo}
                            alt="Token Logo"
                            height="24"
                            width="24"
                            loading="eager"
                            fetchPriority="high"
                            className="rounded-full object-contain"
                        />
                    </div>
                    <span className="ml-3 flex flex-col font-medium text-primary-buttonTextColor overflow-hidden min-w-0 max-w-3/5">
                        {exchange.display_name}
                    </span>
                </>
            ) : (
                <SelectedRoutePlaceholder placeholder={placeholder} />
            )}
            <span className="absolute right-0 pr-2 pl-1 pointer-events-none text-primary-text">
                <ChevronDown className="h-3.5 w-3.5 text-secondary-text" aria-hidden="true" />
            </span>
        </span>
    )
}

export default CexPicker