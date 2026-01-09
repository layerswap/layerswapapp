import { useFormikContext } from "formik";
import { FC, useCallback, useEffect, useState, useMemo } from "react";
import { SwapDirection, SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { Selector, SelectorContent, SelectorTrigger } from "@/components/Select/Selector/Index";
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
import useWindowDimensions from "@/hooks/useWindowDimensions";

const RoutePicker: FC<{ direction: SwapDirection, isExchange?: boolean, className?: string }> = ({ direction, isExchange = false, className }) => {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();
    const [searchQuery, setSearchQuery] = useState("")
    const { windowSize } = useWindowDimensions();
    
    const suggestionsLimit = useMemo(() => {
        if (!windowSize?.height) return 4;
        
        const SUGGESTION_ROW_HEIGHT = 60;
        const COLLAPSED_ROW_HEIGHT = 60;
        const SEARCH_HEIGHT = 40;
        const SUGGESTIONS_TITLE_HEIGHT = 28;
        const ALL_NETWORKS_TITLE_HEIGHT = 44;
        const ALL_NETWORKS_VISIBLE_ROWS = 2.5 * COLLAPSED_ROW_HEIGHT;
        const HEADER_HEIGHT = 52;
        const PADDING = 12;
        
        const isDesktop = windowSize.width && windowSize.width >= 640;
        const maxModalHeight = isDesktop 
            ? windowSize.height * 0.79 
            : windowSize.height * 0.90;
        
        const fixedHeight = SEARCH_HEIGHT + SUGGESTIONS_TITLE_HEIGHT + 
                          ALL_NETWORKS_TITLE_HEIGHT + ALL_NETWORKS_VISIBLE_ROWS + 
                          HEADER_HEIGHT + PADDING + (isDesktop ? 0 : -100);
        
        const availableForSuggestions = maxModalHeight - fixedHeight;
        const calculatedCount = Math.floor(availableForSuggestions / SUGGESTION_ROW_HEIGHT);
        
        return Math.max(4, Math.min(15, calculatedCount));
    }, [windowSize.height]);

    const { allRoutes, isLoading, routeElements, selectedRoute, selectedToken } = useFormRoutes({ direction, values }, searchQuery, suggestionsLimit)
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

    const showBalance = !isExchange && (direction === 'to' || values.depositMethod === 'wallet')

    return (
        <div className={clsx("flex flex-col self-end relative items-center", className)}>
            <Selector>
                <SelectorTrigger data-attr={direction === "from" ? "from-route-picker" : "to-route-picker"} disabled={false} className={"group-[.exchange-picker]:bg-secondary-500 py-1.5 px-2 group-[.exchange-picker]:py-2! group-[.exchange-picker]:px-3! active:animate-press-down group-[.exchange-picker]:active:animate-none"}>
                    <SelectedRouteDisplay route={selectedRoute} token={selectedToken} placeholder="Select token" />
                </SelectorTrigger>
                <SelectorContent isLoading={isLoading} searchHint="Search" header={<PickerWalletConnect direction={direction} />}>
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
            {
                showBalance &&
                <Balance values={values} direction={direction} />
            }
        </div>
    )
};

export default RoutePicker