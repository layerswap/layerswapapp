import { useFormikContext } from "formik";
import { FC, useCallback, useEffect, useState } from "react";
import { SwapDirection, SwapFormValues } from "../DTOs/SwapFormValues";
import { Selector, SelectorContent, SelectorTrigger, useSelectorState } from "../Select/CommandNew/Index";
import { Exchange } from "../../Models/Exchange";
import React from "react";
import { SelectItem } from "../Select/CommandNew/SelectItem/Index";
import useFormRoutes from "@/hooks/useFormRoutes";
import { SelectedRoutePlaceholder } from "./RoutePicker/Routes";
import { LayoutGroup, motion } from "framer-motion";
import { SearchComponent } from "./Search";
import { ImageWithFallback } from "../Common/ImageWithFallback";
import { ChevronDown } from "lucide-react";
import { updateForm } from "../Swap/Form/updateForm";
import { NetworkRoute } from "@/Models/Network";

const CexPicker: FC = () => {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();
    const direction = "from"

    const { exchanges, exchangesRoutesLoading: isLoading, selectedRoute, selectedToken, exchangeNetworks } = useFormRoutes({ direction, values });
    const { fromExchange, toAsset } = values;

    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const updateValues = async () => {
            if (!fromExchange) return;

            const currencyGroup = fromExchange?.token_groups?.find(group => group.symbol === toAsset?.symbol);
            const sourceRoute = exchangeNetworks?.find(route =>
                route?.token
            );

            const sourceRouteToken = sourceRoute?.token
            //TODO refactor form types
            if (values.currencyGroup !== currencyGroup || sourceRouteToken !== selectedToken) {
                await updateForm({
                    formDataKey: 'currencyGroup',
                    formDataValue: currencyGroup,
                    shouldValidate: true,
                    setFieldValue
                });
                await updateForm({
                    formDataKey: 'from',
                    formDataValue: sourceRoute?.network as NetworkRoute,
                    shouldValidate: true,
                    setFieldValue
                });
                await updateForm({
                    formDataKey: 'fromAsset',
                    formDataValue: sourceRouteToken,
                    shouldValidate: false,
                    setFieldValue
                });
            }
        };

        updateValues();
    }, [selectedRoute, selectedToken, exchangeNetworks, exchanges, values]);

    const handleSelect = useCallback(async (exchange: Exchange) => {
        updateForm({
            formDataKey: 'fromExchange',
            formDataValue: exchange,
            shouldValidate: true,
            setFieldValue
        });
    }, [direction, values])

    return (
        <div className="flex w-full flex-col self-end relative ml-auto items-center">
            <Selector>
                <SelectorTrigger disabled={false} className="bg-secondary-500">
                    <SelectedNetworkDisplay exchange={fromExchange} placeholder="Select Exchange" />
                </SelectorTrigger>
                <SelectorContent isLoading={isLoading} modalHeight="full" searchHint="Search" header="">
                    {({ closeModal }) => {
                        const { shouldFocus } = useSelectorState();

                        return (
                            <div className="overflow-y-auto flex flex-col h-full z-40" >
                                <SearchComponent searchQuery={searchQuery} setSearchQuery={setSearchQuery} isOpen={shouldFocus} />
                                <LayoutGroup>
                                    <motion.div layoutScroll className="select-text in-has-[.hide-main-scrollbar]:overflow-y-hidden overflow-y-auto overflow-x-hidden styled-scroll pr-3 h-full">
                                        <div className="relative">
                                            {exchanges.map((exchange) => {
                                                return <div className="py-1 box-border" key={exchange.name}>
                                                    <ExchangeNetwork
                                                        route={exchange}
                                                        direction={direction}
                                                        onSelect={(n) => {
                                                            handleSelect(n);
                                                            closeModal();
                                                        }}
                                                    />
                                                </div>
                                            })}
                                        </div>
                                    </motion.div>
                                </LayoutGroup>
                            </div>
                        )
                    }}
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