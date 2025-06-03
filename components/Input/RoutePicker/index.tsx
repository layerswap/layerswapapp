import { useFormikContext } from "formik";
import { FC, useCallback, useEffect, useState } from "react";
import { SwapDirection, SwapFormValues } from "../../DTOs/SwapFormValues";
import React from "react";
import useFormRoutes from "../../../hooks/useFormRoutes";
import Balance from "../Amount/Balance";
import { Route } from "../../../Models/Route";

type Props = {
    direction: SwapDirection;
}
export default function ({ direction }: Props) {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();

    const [searchQuery, setSearchQuery] = useState("")
    const { destinationGroups, destinationNetwork, destinationToken, destinationxchange, exchangeToken, sourceExchange, sourceGroups, sourceNetwork, sourceToken } = useFormRoutes({ direction, values })
    const currencyFieldName = direction === 'from' ? 'fromCurrency' : 'toCurrency';

    const handleSelect = useCallback(async (route: Route) => {
        if (route.cex) {
            setFieldValue(currencyFieldName, null)
            setFieldValue(direction, null)
            setFieldValue(`${direction}Exchange`, route, true)
        }
        else {
            setFieldValue(`${direction}Exchange`, null)
            setFieldValue(direction, route, true)
        }
    }, [currencyFieldName, direction, values])

    const groups = direction === 'from' ? sourceGroups : destinationGroups;

    return (
        <div className="flex w-full flex-col self-end relative ml-auto items-center">
          
        </div>
    )
};


