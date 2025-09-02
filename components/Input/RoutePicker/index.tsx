import { useFormikContext } from "formik";
import { FC, useCallback, useEffect, useState } from "react";
import { SwapDirection, SwapFormValues } from "../../DTOs/SwapFormValues";
import { Selector, SelectorContent, SelectorTrigger } from "../../Select/Selector/Index";
import { SelectedRouteDisplay } from "./Routes";
import React from "react";
import useFormRoutes from "@/hooks/useFormRoutes";
import Balance from "../Amount/Balance";
import { Content } from "./Content";
import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import PickerWalletConnect from "./RouterPickerWalletConnect";
import { swapInProgress } from "@/components/utils/swapUtils";
import { updateForm } from "@/components/Swap/Form/updateForm";
import clsx from "clsx";

const RoutePicker: FC<{ direction: SwapDirection, isExchange?: boolean, className?: string }> = ({ direction, isExchange = false, className }) => {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();
    const [searchQuery, setSearchQuery] = useState("")
    const { allRoutes, isLoading, routeElements, selectedRoute, selectedToken, allbalancesLoaded } = useFormRoutes({ direction, values }, searchQuery)
    const currencyFieldName = direction === 'from' ? 'fromAsset' : 'toAsset';

    useEffect(() => {
        const updateValues = async () => {
            if (!selectedRoute || !selectedToken || !allRoutes || swapInProgress.current) return;

            const updatedRoute = allRoutes.find(r => r.name === selectedRoute.name);
            const updatedToken = updatedRoute?.tokens?.find(t => t.symbol === selectedToken.symbol);

            if (updatedToken === selectedToken) return;

            if (updatedRoute && updatedToken) {
                await updateForm({
                    formDataKey: currencyFieldName,
                    formDataValue: updatedToken,
                    shouldValidate: true,
                    setFieldValue
                })
            }
        };

        updateValues();
    }, [selectedRoute, selectedToken, allRoutes, direction]);

    const handleSelect = useCallback(async (route: NetworkRoute, token: NetworkRouteToken) => {
        swapInProgress.current = false;
        await updateForm({
            formDataKey: currencyFieldName,
            formDataValue: token,
            shouldValidate: true,
            setFieldValue
        })
        await updateForm({
            formDataKey: direction,
            formDataValue: route,
            shouldValidate: true,
            setFieldValue
        })
    }, [currencyFieldName, direction, values])

    return (
        <div className={clsx("flex w-full flex-col self-end relative ml-auto items-center", className)}>
            <Selector>
                <SelectorTrigger disabled={false} className="group-[.exchange-picker]:bg-secondary-500">
                    <SelectedRouteDisplay route={selectedRoute} token={selectedToken} placeholder="Select Token" />
                </SelectorTrigger>
                <SelectorContent isLoading={isLoading} searchHint="Search" header={<PickerWalletConnect direction={direction} />}>
                    {({ closeModal }) => (
                        <Content
                            allbalancesLoaded={allbalancesLoaded}
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
            {
                (direction === 'to' || values.depositMethod === 'wallet') && !isExchange &&
                <Balance values={values} direction={direction} />
            }
        </div>
    )
};

export default RoutePicker