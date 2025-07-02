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
import { useRouteTokenSwitchStore } from "@/stores/routeTokenSwitchStore";
import { swapInProgress } from "@/components/utils/swapUtils";
import { updateForm } from "@/components/Swap/Form/updateForm";
import { useRouter } from "next/router";

const RoutePicker: FC<{ direction: SwapDirection }> = ({ direction }) => {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();
    const [searchQuery, setSearchQuery] = useState("")
    const { allRoutes, isLoading, routeElements, tokenElements, selectedRoute, selectedToken, allbalancesLoaded } = useFormRoutes({ direction, values }, searchQuery)
    const currencyFieldName = direction === 'from' ? 'fromAsset' : 'toAsset';
    const showTokens = useRouteTokenSwitchStore((s) => s.showTokens)

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
    }, [currencyFieldName, direction, values, showTokens])

    return (
        <div className="flex w-full flex-col self-end relative ml-auto items-center">
            <Selector>
                <SelectorTrigger disabled={false}>
                    <SelectedRouteDisplay route={selectedRoute} token={selectedToken} placeholder="Select Token" />
                </SelectorTrigger>
                <SelectorContent isLoading={isLoading} modalHeight="full" searchHint="Search" header={<PickerWalletConnect direction={direction} />}>
                    {({ closeModal }) => (
                        <Content
                            allbalancesLoaded={allbalancesLoaded}
                            onSelect={(r, t) => { handleSelect(r, t); closeModal(); }}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            rowElements={showTokens ? tokenElements : routeElements}
                            direction={direction}
                            selectedRoute={selectedRoute?.name}
                            selectedToken={selectedToken?.symbol}
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