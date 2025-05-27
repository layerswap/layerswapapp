import { useFormikContext } from "formik";
import { FC, useCallback, useEffect, useState } from "react";
import { SwapDirection, SwapFormValues } from "../../DTOs/SwapFormValues";
import { Selector, SelectorContent, SelectorTrigger } from "../../Select/CommandNew/Index";
import { SelectedRouteDisplay } from "./Routes";
import React from "react";
import useFormRoutes from "../../../hooks/useFormRoutes";
import { Route, RouteToken } from "../../../Models/Route";
import Balance from "../Amount/Balance";
import { Content } from "./Content";


const RoutePicker: FC<{ direction: SwapDirection }> = ({ direction }) => {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();

    const [searchQuery, setSearchQuery] = useState("")
    const { allRoutes, isLoading, routeElements, selectedRoute, selectedToken } = useFormRoutes({ direction, values }, searchQuery)

    const currencyFieldName = direction === 'from' ? 'fromCurrency' : 'toCurrency';

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
        <div className="flex w-full flex-col self-end relative ml-auto items-center">
            <Selector>
                <SelectorTrigger disabled={false}>
                    <SelectedRouteDisplay route={selectedRoute} token={selectedToken} placeholder="Select Token" />
                </SelectorTrigger>
                <SelectorContent isLoading={isLoading} modalHeight="full" searchHint="Search">
                    {({ closeModal }) => (
                        <Content
                            onSelect={(r, t) => { handleSelect(r, t); closeModal(); }}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            rowElements={routeElements}
                            direction={direction}
                            selectedRoute={selectedRoute?.name}
                            selectedToken={selectedToken?.symbol}
                        />
                    )}
                </SelectorContent>
            </Selector>
            {direction === 'from' &&
                <Balance values={values} direction="from" />
            }
        </div>
    )
};



export default RoutePicker