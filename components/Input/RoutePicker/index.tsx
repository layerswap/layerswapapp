import { useFormikContext } from "formik";
import { FC, useCallback, useEffect, useRef, useState } from "react";
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
import useSuggestionsLimit from "@/hooks/useSuggestionsLimit";
import useWallet from "@/hooks/useWallet";

const RoutePicker: FC<{ direction: SwapDirection, isExchange?: boolean, className?: string }> = ({ direction, isExchange = false, className }) => {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();
    const [searchQuery, setSearchQuery] = useState("")
    const { wallets } = useWallet()
    const showsWalletButton = wallets.length === 0 && direction === 'from' && !searchQuery;

    const ref = useRef<HTMLDivElement>(null);

    const { suggestionsLimit } = useSuggestionsLimit({ hasWallet: wallets.length > 0, });

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
    }, [currencyFieldName, direction])

    const showBalance = !isExchange && (direction === 'to' || values.depositMethod === 'wallet')

    return (
        <div className={clsx("flex flex-col self-end relative items-center", className)}>
            <Selector>
                <SelectorTrigger data-attr={direction === "from" ? "from-route-picker" : "to-route-picker"} disabled={false} className={"group-[.exchange-picker]:bg-secondary-500 py-1.5 px-2 group-[.exchange-picker]:py-2! group-[.exchange-picker]:px-3! active:animate-press-down group-[.exchange-picker]:active:animate-none"}>
                    <SelectedRouteDisplay route={selectedRoute} token={selectedToken} placeholder="Select token" />
                </SelectorTrigger>
                <SelectorContent
                    isLoading={isLoading}
                    searchHint="Search"
                    header={<PickerWalletConnect direction={direction} />}
                    ref={ref}
                >
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