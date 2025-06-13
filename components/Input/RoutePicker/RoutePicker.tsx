import { useFormikContext } from "formik";
import { FC, useCallback, useEffect, useState } from "react";
import { SwapDirection, SwapFormValues } from "../../DTOs/SwapFormValues";
import { Selector, SelectorContent, SelectorTrigger } from "../../Select/CommandNew/Index";
import { SelectedRouteDisplay } from "./Routes";
import React from "react";
import useFormRoutes from "../../../hooks/useFormRoutes";
import Balance from "../Amount/Balance";
import { Content } from "./Content";
import { NetworkRoute, NetworkRouteToken } from "../../../Models/Network";
import PickerWalletConnect from "./RouterPickerWalletConnect";

const RoutePicker: FC<{ direction: SwapDirection }> = ({ direction }) => {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();

    const [searchQuery, setSearchQuery] = useState("")
    const { allRoutes, isLoading, routeElements, tokenElements, selectedRoute, selectedToken, allbalancesLoaded } = useFormRoutes({ direction, values }, searchQuery)
    const currencyFieldName = direction === 'from' ? 'fromCurrency' : 'toCurrency';
    const [showTokens, setShowTokens] = useState(false);

    useEffect(() => {

        if (!selectedRoute || !selectedToken || !allRoutes) return

        const updatedRoute = allRoutes.find(r => r.name === selectedRoute.name)

        const updatedToken = updatedRoute?.tokens?.find(t => t.symbol === selectedToken.symbol)

        if (updatedToken === selectedToken) return

        if (updatedRoute && updatedToken) {
            setFieldValue(currencyFieldName, updatedToken, true)
            setFieldValue(direction, updatedRoute, true)
        }

    }, [selectedRoute, selectedToken, allRoutes])

    const handleSelect = useCallback(async (route: NetworkRoute, token: NetworkRouteToken) => {
        setFieldValue(currencyFieldName, token, true)
        setFieldValue(direction, route, true)
    }, [currencyFieldName, direction, values, showTokens])

    return (
        <div className="flex w-full flex-col self-end relative ml-auto items-center">
            <Selector>
                <SelectorTrigger disabled={false}>
                    <SelectedRouteDisplay route={selectedRoute} token={selectedToken} placeholder="Select Token" />
                </SelectorTrigger>
                <SelectorContent isLoading={isLoading} modalHeight="full" searchHint="Search" header={<PickerWalletConnect />}>
                    {({ closeModal }) => (
                        <Content
                            key={String(showTokens)}
                            allbalancesLoaded={allbalancesLoaded}
                            onSelect={(r, t) => { handleSelect(r, t); closeModal(); }}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            rowElements={showTokens ? tokenElements : routeElements}
                            direction={direction}
                            selectedRoute={selectedRoute?.name}
                            selectedToken={selectedToken?.symbol}
                            showTokens={showTokens}
                            setShowTokens={setShowTokens}
                        />
                    )}
                </SelectorContent>
            </Selector>
            {
                direction === 'from' &&
                <Balance values={values} direction="from" />
            }
        </div>
    )
};



export default RoutePicker